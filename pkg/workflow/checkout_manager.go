package workflow

import (
	"fmt"
	"strings"

	"github.com/github/gh-aw/pkg/logger"
)

var checkoutManagerLog = logger.New("workflow:checkout_manager")

// CheckoutManager collects checkout requests from the user and emits a deduplicated,
// merged list of actions/checkout steps for the agent job.
//
// Merge rules:
//   - Entries are grouped by (repository, checkout-dir) key.
//     An empty repository is normalised to "" (current repo), and an empty checkout-dir
//     is normalised to "." so that two root-checkout entries always merge correctly.
//   - When two entries share the same key the one with the "deepest" fetch-depth wins:
//     fetch-depth 0 (full history) beats any positive value; a higher value beats a lower
//     one.  nil fetch-depth is treated as depth 1 (the actions/checkout default).
//   - All other fields (token, ref, submodules, sparse-checkout, lfs, …) are taken from
//     the first entry with that key.
type CheckoutManager struct {
	entries []*CheckoutConfig // ordered list after deduplication
	index   map[string]int    // key → index in entries for fast lookup
}

// checkoutKey returns the deduplication key for an entry.
func checkoutKey(e *CheckoutConfig) string {
	dir := e.CheckoutDir
	if dir == "" {
		dir = "."
	}
	return e.Repository + "\x00" + dir
}

// effectiveFetchDepth returns the resolved fetch depth for an entry.
// nil is treated as 1 (the actions/checkout default).
func effectiveFetchDepth(e *CheckoutConfig) int {
	if e.FetchDepth == nil {
		return 1
	}
	return *e.FetchDepth
}

// add inserts or merges entry e into the manager's list.
func (m *CheckoutManager) add(e *CheckoutConfig) {
	key := checkoutKey(e)
	if idx, exists := m.index[key]; exists {
		// Merge: take the deepest fetch-depth.
		existing := m.entries[idx]
		existingDepth := effectiveFetchDepth(existing)
		newDepth := effectiveFetchDepth(e)
		// 0 = full history (deepest), otherwise higher value = more commits = deeper
		if newDepth == 0 || (existingDepth != 0 && newDepth > existingDepth) {
			m.entries[idx].FetchDepth = e.FetchDepth
			checkoutManagerLog.Printf("Merged checkout key %q: updated fetch-depth to %v", key, e.FetchDepth)
		}
		return
	}
	m.index[key] = len(m.entries)
	clone := *e // shallow copy to avoid mutating caller's slice
	m.entries = append(m.entries, &clone)
	checkoutManagerLog.Printf("Added checkout entry: repository=%q checkout-dir=%q fetch-depth=%v", e.Repository, e.CheckoutDir, e.FetchDepth)
}

// NewCheckoutManager creates a CheckoutManager pre-seeded with the user-supplied entries.
//
//   - disabled=true  → returns a manager that produces no checkout steps.
//   - entries=nil    → the manager uses the default single workspace-root checkout.
//   - entries=[…]    → the supplied list is processed and deduplicated.
func NewCheckoutManager(disabled bool, entries []*CheckoutConfig) *CheckoutManager {
	m := &CheckoutManager{index: make(map[string]int)}
	if disabled {
		return m
	}
	if len(entries) == 0 {
		// Default: single workspace-root checkout of the current repo.
		m.add(&CheckoutConfig{})
	} else {
		for _, e := range entries {
			if e != nil {
				m.add(e)
			}
		}
	}
	return m
}

// Entries returns the merged, deduplicated list of checkout configurations.
func (m *CheckoutManager) Entries() []*CheckoutConfig {
	return m.entries
}

// HasCheckout returns true if the manager will emit at least one checkout step.
func (m *CheckoutManager) HasCheckout() bool {
	return len(m.entries) > 0
}

// GenerateCheckoutSteps emits YAML checkout steps into the provided builder.
//
// It handles all three cases in one place:
//   - dev-mode CLI build steps are injected after the first workspace-root checkout
//   - trial-mode repository and token overrides are applied to the first checkout
//   - persist-credentials is always false
func (m *CheckoutManager) GenerateCheckoutSteps(
	yaml *strings.Builder,
	c *Compiler,
	data *WorkflowData,
) {
	if len(m.entries) == 0 {
		checkoutManagerLog.Print("No checkout entries – skipping")
		return
	}

	checkoutManagerLog.Printf("Generating %d checkout step(s)", len(m.entries))

	for i, entry := range m.entries {
		isFirst := i == 0
		isWorkspaceRoot := entry.CheckoutDir == ""

		// Step name
		if entry.Repository != "" {
			fmt.Fprintf(yaml, "      - name: Checkout %s\n", entry.Repository)
		} else if isFirst {
			yaml.WriteString("      - name: Checkout repository\n")
		} else {
			yaml.WriteString("      - name: Checkout additional repository\n")
		}

		fmt.Fprintf(yaml, "        uses: %s\n", GetActionPin("actions/checkout"))
		yaml.WriteString("        with:\n")

		// persist-credentials is always false – credentials are managed separately.
		yaml.WriteString("          persist-credentials: false\n")

		// Repository
		if entry.Repository != "" {
			fmt.Fprintf(yaml, "          repository: %s\n", entry.Repository)
		} else if isFirst && c.trialMode && c.trialLogicalRepoSlug != "" {
			fmt.Fprintf(yaml, "          repository: %s\n", c.trialLogicalRepoSlug)
		}

		// Token
		if entry.GitHubToken != "" {
			fmt.Fprintf(yaml, "          token: %s\n", entry.GitHubToken)
		} else if isFirst && c.trialMode {
			fmt.Fprintf(yaml, "          token: %s\n", getEffectiveGitHubToken(""))
		}

		// Ref
		if entry.Ref != "" {
			fmt.Fprintf(yaml, "          ref: %s\n", entry.Ref)
		}

		// Checkout directory (path)
		if entry.CheckoutDir != "" {
			fmt.Fprintf(yaml, "          path: %s\n", entry.CheckoutDir)
		}

		// Fetch depth
		if entry.FetchDepth != nil {
			fmt.Fprintf(yaml, "          fetch-depth: %d\n", *entry.FetchDepth)
		}

		// Submodules
		if entry.Submodules != "" {
			fmt.Fprintf(yaml, "          submodules: %s\n", entry.Submodules)
		}

		// Sparse checkout
		if entry.SparseCheckout != "" {
			yaml.WriteString("          sparse-checkout: |\n")
			for line := range strings.SplitSeq(strings.TrimRight(entry.SparseCheckout, "\n"), "\n") {
				fmt.Fprintf(yaml, "            %s\n", line)
			}
		}

		// Sparse checkout cone mode
		if entry.SparseCheckoutConeMode != nil {
			if *entry.SparseCheckoutConeMode {
				yaml.WriteString("          sparse-checkout-cone-mode: true\n")
			} else {
				yaml.WriteString("          sparse-checkout-cone-mode: false\n")
			}
		}

		// LFS
		if entry.LFS != nil {
			if *entry.LFS {
				yaml.WriteString("          lfs: true\n")
			} else {
				yaml.WriteString("          lfs: false\n")
			}
		}

		// Dev-mode CLI build steps are injected right after the first workspace-root checkout.
		if isFirst && isWorkspaceRoot && c.actionMode.IsDev() {
			if _, hasAgenticWorkflows := data.Tools["agentic-workflows"]; hasAgenticWorkflows {
				checkoutManagerLog.Print("Generating CLI build steps for dev mode (agentic-workflows tool enabled)")
				c.generateDevModeCLIBuildSteps(yaml)
			} else {
				checkoutManagerLog.Print("Skipping CLI build steps in dev mode (agentic-workflows tool not enabled)")
			}
		}
	}
}
