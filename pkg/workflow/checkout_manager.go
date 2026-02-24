package workflow

import (
	"fmt"
	"strings"

	"github.com/github/gh-aw/pkg/logger"
)

var checkoutManagerLog = logger.New("workflow:checkout_manager")

// CheckoutManager collects checkout requests and produces a deduplicated, merged list of
// actions/checkout steps to emit in the agent job.
//
// Merge rules:
//   - Entries are grouped by (repository, path) key.  "repository" is normalised to ""
//     when it refers to the current (trigger) repository so that an explicit repository
//     value that happens to match the default merges correctly.
//   - When two entries share the same key, the one with the "deepest" fetch-depth wins:
//     fetch-depth 0 (full history) > any positive value (higher = more commits fetched).
//     A nil fetch-depth is treated as depth 1 (the actions/checkout default).
//   - All other properties of the winning entry are preserved; the token, submodules,
//     sparse-checkout, LFS, and ref of the first entry with that key are kept.
type CheckoutManager struct {
	// ordered list of resolved entries after deduplication
	entries []*CheckoutConfig
	// index used for fast deduplication lookups
	index map[string]int
}

// NewCheckoutManager creates a CheckoutManager pre-seeded with the user-supplied entries
// from the workflow frontmatter `checkout` field.
//
//   - disabled=true → returns a manager that produces no checkout steps.
//   - entries=nil   → the manager's default behaviour (one workspace-root checkout) is used.
//   - entries=[…]   → the supplied list is processed and deduplicated.
func NewCheckoutManager(disabled bool, entries []*CheckoutConfig) *CheckoutManager {
	m := &CheckoutManager{
		index: make(map[string]int),
	}
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

// checkoutKey returns the deduplication key for an entry.
// repository="" and path="" both normalise to "." for comparison purposes.
func checkoutKey(e *CheckoutConfig) string {
	repo := e.Repository
	path := e.Path
	if path == "" {
		path = "."
	}
	return repo + "\x00" + path
}

// deeperFetch returns the effective fetch depth (int, where 0 = unlimited, 1 = default).
func effectiveFetchDepth(e *CheckoutConfig) int {
	if e.FetchDepth == nil {
		return 1 // actions/checkout default
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

		if newDepth == 0 || (existingDepth != 0 && newDepth > existingDepth) {
			// New entry has deeper (or unlimited) fetch; update fetch-depth only.
			m.entries[idx].FetchDepth = e.FetchDepth
			checkoutManagerLog.Printf("Merged checkout entry for key %q: updated fetch-depth to %v", key, e.FetchDepth)
		}
		return
	}

	// New entry – append and record its index.
	m.index[key] = len(m.entries)
	clone := *e // shallow copy to avoid mutation of caller's slice
	m.entries = append(m.entries, &clone)
	checkoutManagerLog.Printf("Added checkout entry: repository=%q path=%q fetch-depth=%v", e.Repository, e.Path, e.FetchDepth)
}

// Entries returns the merged, deduplicated list of checkout configurations.
func (m *CheckoutManager) Entries() []*CheckoutConfig {
	return m.entries
}

// GenerateCheckoutSteps emits the YAML checkout steps into yaml using the manager's entries.
//
// For the first checkout step (workspace-root checkout), if devMode is true and the
// agenticWorkflowsEnabled flag is set, the dev-mode CLI build steps are injected
// immediately after.
//
// trialMode / trialLogicalRepoSlug are forwarded for backwards-compatible trial-mode
// behaviour (the first checkout can target a different repository in that mode).
func (m *CheckoutManager) GenerateCheckoutSteps(
	yaml *strings.Builder,
	c *Compiler,
	data *WorkflowData,
) {
	if len(m.entries) == 0 {
		checkoutManagerLog.Print("No checkout entries – skipping checkout step generation")
		return
	}

	checkoutManagerLog.Printf("Generating %d checkout step(s)", len(m.entries))

	for i, entry := range m.entries {
		isFirst := i == 0
		isWorkspaceRoot := entry.Path == ""

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
			// Trial mode: checkout the logical repo instead.
			fmt.Fprintf(yaml, "          repository: %s\n", c.trialLogicalRepoSlug)
		}

		// Token
		if entry.Token != "" {
			fmt.Fprintf(yaml, "          token: %s\n", entry.Token)
		} else if isFirst && c.trialMode {
			effectiveToken := getEffectiveGitHubToken("")
			fmt.Fprintf(yaml, "          token: %s\n", effectiveToken)
		}

		// Ref
		if entry.Ref != "" {
			fmt.Fprintf(yaml, "          ref: %s\n", entry.Ref)
		}

		// Path (checkout-dir)
		if entry.Path != "" {
			fmt.Fprintf(yaml, "          path: %s\n", entry.Path)
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
