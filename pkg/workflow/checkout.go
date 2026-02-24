package workflow

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/github/gh-aw/pkg/logger"
)

var checkoutLog = logger.New("workflow:checkout")

// CheckoutItemConfig represents configuration for a single checkout step.
// It maps closely to the parameters of actions/checkout.
//
// When "repository" and "checkout-dir" are both empty, this item configures
// the default workspace checkout (current repo checked out to GITHUB_WORKSPACE).
// When "repository" or "checkout-dir" is set, it creates an additional checkout.
type CheckoutItemConfig struct {
	// Repository to check out in "owner/repo" format.
	// When empty (default), the current repository is used.
	Repository string `json:"repository,omitempty"`

	// CheckoutDir is the relative path (under GITHUB_WORKSPACE) where the
	// repository will be checked out. When empty (default), the workspace
	// root is used. Corresponds to the actions/checkout "path" parameter.
	CheckoutDir string `json:"checkout-dir,omitempty"`

	// Ref is the branch, tag, or SHA to check out.
	// When empty (default), the ref that triggered the workflow is used.
	Ref string `json:"ref,omitempty"`

	// Token is a custom GitHub token for accessing private repositories
	// or for elevated permissions. Corresponds to actions/checkout "token" parameter.
	// When empty, the default GITHUB_TOKEN is used (unless trial mode overrides it).
	Token string `json:"github-token,omitempty"`

	// FetchDepth controls how many commits to fetch.
	//   nil  - use the actions/checkout default (shallow clone, 1 commit)
	//   0    - fetch full history (deepest possible)
	//   N>0  - fetch exactly N commits
	FetchDepth *int `json:"fetch-depth,omitempty"`

	// Submodules controls submodule checkout behaviour.
	// Supported values: "" (disabled, default), "true", "recursive".
	Submodules string `json:"submodules,omitempty"`

	// LFS controls whether to download Git-LFS files.
	LFS bool `json:"lfs,omitempty"`
}

// isRootCheckout returns true when this item configures the default workspace checkout,
// i.e. it does not specify an alternative repository or checkout directory.
func (c *CheckoutItemConfig) isRootCheckout() bool {
	return c.Repository == "" && c.CheckoutDir == ""
}

// ParseCheckoutConfig parses the raw "checkout" frontmatter field.
// The field supports two forms:
//
//  1. A single object that configures the default repository checkout:
//
//     checkout:
//     fetch-depth: 0
//     github-token: ${{ secrets.MY_TOKEN }}
//
//  2. An array where items without "repository"/"checkout-dir" configure the
//     default checkout and items with those fields create additional checkouts:
//
//     checkout:
//     - fetch-depth: 0
//     - repository: owner/other-repo
//     checkout-dir: ./other-repo
//     ref: main
//     github-token: ${{ secrets.TOKEN }}
//
// Returns nil, nil when the raw value is nil (field absent from frontmatter).
func ParseCheckoutConfig(raw any) ([]*CheckoutItemConfig, error) {
	if raw == nil {
		return nil, nil
	}

	switch v := raw.(type) {
	case map[string]any:
		// Single-object form – configures the default checkout.
		item, err := parseCheckoutItem(v)
		if err != nil {
			return nil, err
		}
		return []*CheckoutItemConfig{item}, nil

	case []any:
		// Array form – a list of checkout specifications.
		var items []*CheckoutItemConfig
		for i, elem := range v {
			itemMap, ok := elem.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("checkout[%d]: must be an object", i)
			}
			item, err := parseCheckoutItem(itemMap)
			if err != nil {
				return nil, fmt.Errorf("checkout[%d]: %w", i, err)
			}
			items = append(items, item)
		}
		return items, nil

	default:
		return nil, errors.New("checkout: must be an object or an array of objects")
	}
}

// parseCheckoutItem converts a map[string]any to a *CheckoutItemConfig using JSON
// as an intermediate representation for clean field mapping.
func parseCheckoutItem(m map[string]any) (*CheckoutItemConfig, error) {
	data, err := json.Marshal(m)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal checkout item: %w", err)
	}
	var item CheckoutItemConfig
	if err := json.Unmarshal(data, &item); err != nil {
		return nil, fmt.Errorf("failed to unmarshal checkout item: %w", err)
	}
	return &item, nil
}

// CheckoutManager manages all actions/checkout steps emitted in the agent job.
//
// It collects checkout requests from two sources:
//   - Internal compiler needs (trial mode, dev mode, .github/.agents access, etc.)
//   - User-defined configuration from the frontmatter "checkout" field
//
// For requests targeting the root checkout (same repository, workspace root path) the
// manager applies "deepest fetch" semantics: among all requested fetch-depths the
// maximum is used (fetch-depth 0 = unlimited history, which beats any positive value).
//
// The manager always emits persist-credentials: false on every checkout step.
type CheckoutManager struct {
	// Root checkout settings (merged from all root-targeting requests).
	fetchDepth    int    // -1 = not set (use actions/checkout default); 0 = unlimited
	fetchDepthSet bool   // whether any explicit fetch-depth was requested
	token         string // custom GitHub token (empty = use GITHUB_TOKEN or effective token)
	ref           string // custom ref (empty = use the ref that triggered the workflow)
	submodules    string // submodule handling: "", "true", "recursive"
	lfs           bool   // whether to fetch LFS files

	// Compiler-level state injected at construction time.
	trialMode    bool
	trialLogical string // logical repository slug for trial mode (owner/repo)
	devMode      bool   // whether action mode is dev (requires full checkout for build steps)

	// Additional checkouts: repositories checked out at specific paths.
	additionals []*CheckoutItemConfig
}

// NewCheckoutManager creates a CheckoutManager pre-loaded with the current compiler state.
//
// Parameters:
//   - trialMode:    whether the compiler is operating in trial mode
//   - trialLogical: the logical repository slug used in trial mode (may be empty)
//   - devMode:      whether the compiler is in dev mode (requires full repo checkout)
func NewCheckoutManager(trialMode bool, trialLogical string, devMode bool) *CheckoutManager {
	return &CheckoutManager{
		fetchDepth:   -1, // not explicitly set
		trialMode:    trialMode,
		trialLogical: trialLogical,
		devMode:      devMode,
	}
}

// ApplyUserCheckouts incorporates user-defined checkout items from frontmatter.
//
// Items that are "root checkouts" (no repository/checkout-dir) update the root
// checkout settings using deepest-fetch semantics.
// Items with a repository or checkout-dir are collected as additional checkouts.
func (m *CheckoutManager) ApplyUserCheckouts(items []*CheckoutItemConfig) {
	for _, item := range items {
		if item == nil {
			continue
		}
		if item.isRootCheckout() {
			m.mergeRootSettings(item)
		} else {
			m.additionals = append(m.additionals, item)
		}
	}
}

// HasAdditionalCheckouts returns true when there are additional checkouts beyond
// the default workspace checkout.
func (m *CheckoutManager) HasAdditionalCheckouts() bool {
	return len(m.additionals) > 0
}

// mergeRootSettings applies one root-checkout item to the manager state using
// deepest-fetch semantics.
func (m *CheckoutManager) mergeRootSettings(item *CheckoutItemConfig) {
	if item.FetchDepth != nil {
		m.setFetchDepth(*item.FetchDepth)
	}
	if item.Token != "" {
		m.token = item.Token
	}
	if item.Ref != "" {
		m.ref = item.Ref
	}
	if item.Submodules != "" {
		m.submodules = item.Submodules
	}
	if item.LFS {
		m.lfs = true
	}
	checkoutLog.Printf("Merged root checkout settings: fetch-depth=%v token=%v ref=%v", item.FetchDepth, item.Token != "", item.Ref)
}

// setFetchDepth records an explicit fetch-depth request using "deepest" semantics:
//   - fetch-depth 0 (unlimited history) wins over any positive value
//   - Among positive values the larger value wins (more history = deeper)
func (m *CheckoutManager) setFetchDepth(depth int) {
	if !m.fetchDepthSet {
		m.fetchDepth = depth
		m.fetchDepthSet = true
		return
	}
	// Once unlimited (0) is set it cannot become shallower.
	if m.fetchDepth == 0 {
		return
	}
	// A new request of 0 (unlimited) or a greater positive depth wins.
	if depth == 0 || depth > m.fetchDepth {
		m.fetchDepth = depth
	}
}

// GenerateRootCheckoutStep writes the YAML for the main (default workspace) checkout step
// to the provided strings.Builder with 6-space indentation.
//
// The step always includes persist-credentials: false.
// User-configured properties (fetch-depth, github-token, ref, submodules, lfs) are
// emitted when set.
// Trial-mode logic (repository override, token) is handled transparently.
func (m *CheckoutManager) GenerateRootCheckoutStep(yaml *strings.Builder) {
	checkoutLog.Printf("Generating root checkout step: trial=%v devMode=%v fetchDepthSet=%v", m.trialMode, m.devMode, m.fetchDepthSet)

	yaml.WriteString("      - name: Checkout repository\n")
	fmt.Fprintf(yaml, "        uses: %s\n", GetActionPin("actions/checkout"))
	yaml.WriteString("        with:\n")
	yaml.WriteString("          persist-credentials: false\n")

	// Trial mode: optionally override the checked-out repository and supply a token.
	if m.trialMode {
		if m.trialLogical != "" {
			fmt.Fprintf(yaml, "          repository: %s\n", m.trialLogical)
		}
		// Prefer user-supplied token; fall back to the effective default token.
		token := m.token
		if token == "" {
			token = getEffectiveGitHubToken("")
		}
		fmt.Fprintf(yaml, "          token: %s\n", token)
	} else if m.token != "" {
		// Non-trial mode: emit custom token only when the user explicitly provided one.
		fmt.Fprintf(yaml, "          token: %s\n", m.token)
	}

	// Optional: custom ref.
	if m.ref != "" {
		fmt.Fprintf(yaml, "          ref: %s\n", m.ref)
	}

	// Optional: explicit fetch-depth (omit to use actions/checkout default of 1).
	if m.fetchDepthSet {
		fmt.Fprintf(yaml, "          fetch-depth: %d\n", m.fetchDepth)
	}

	// Optional: submodules.
	if m.submodules != "" {
		fmt.Fprintf(yaml, "          submodules: %s\n", m.submodules)
	}

	// Optional: LFS.
	if m.lfs {
		yaml.WriteString("          lfs: true\n")
	}
}

// GenerateAdditionalCheckoutSteps writes YAML for each additional checkout
// (repositories checked out at paths other than the workspace root).
// Each step always includes persist-credentials: false.
func (m *CheckoutManager) GenerateAdditionalCheckoutSteps(yaml *strings.Builder) {
	for _, item := range m.additionals {
		if item == nil {
			continue
		}

		// Build a human-readable step name.
		stepName := item.Repository
		if stepName == "" {
			stepName = item.CheckoutDir
		}
		if stepName == "" {
			stepName = "additional repository"
		}

		checkoutLog.Printf("Generating additional checkout step: %s -> %s", stepName, item.CheckoutDir)

		fmt.Fprintf(yaml, "      - name: Checkout %s\n", stepName)
		fmt.Fprintf(yaml, "        uses: %s\n", GetActionPin("actions/checkout"))
		yaml.WriteString("        with:\n")
		yaml.WriteString("          persist-credentials: false\n")

		if item.Repository != "" {
			fmt.Fprintf(yaml, "          repository: %s\n", item.Repository)
		}
		if item.CheckoutDir != "" {
			fmt.Fprintf(yaml, "          path: %s\n", item.CheckoutDir)
		}
		if item.Ref != "" {
			fmt.Fprintf(yaml, "          ref: %s\n", item.Ref)
		}
		if item.Token != "" {
			fmt.Fprintf(yaml, "          token: %s\n", item.Token)
		}
		if item.FetchDepth != nil {
			fmt.Fprintf(yaml, "          fetch-depth: %d\n", *item.FetchDepth)
		}
		if item.Submodules != "" {
			fmt.Fprintf(yaml, "          submodules: %s\n", item.Submodules)
		}
		if item.LFS {
			yaml.WriteString("          lfs: true\n")
		}
	}
}
