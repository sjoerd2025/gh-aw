package workflow

// CheckoutManager handles collection and merging of checkout configurations
// from the workflow frontmatter "checkout" field.
//
// It implements the following behaviors:
//   - Multiple configs targeting the same (repository, ref, path) are merged into one step
//   - fetch-depth: the deepest value wins (0 = full history beats any positive value)
//   - sparse-checkout patterns are unioned across merged configs
//   - lfs and submodules are OR-ed (any request enables them)
//
// The "default" checkout targets the workspace root (path="" and repository="").
// All other checkouts are emitted as additional steps after the default.
import (
	"errors"
	"fmt"
	"strings"

	"github.com/github/gh-aw/pkg/logger"
)

var checkoutManagerLog = logger.New("workflow:checkout_manager")

// CheckoutConfig represents a single checkout entry from the "checkout" frontmatter field.
//
// Example (single checkout):
//
//	checkout:
//	  fetch-depth: 0
//	  token: ${{ secrets.MY_TOKEN }}
//
// Example (multiple checkouts):
//
//	checkout:
//	  - path: .
//	    fetch-depth: 0
//	  - repository: owner/other-repo
//	    path: ./libs/other
//	    ref: main
type CheckoutConfig struct {
	// Repository in owner/repo format. Defaults to the current repository.
	Repository string `json:"repository,omitempty"`

	// Ref (branch, tag, or SHA) to checkout. Defaults to the triggering ref.
	Ref string `json:"ref,omitempty"`

	// Path within GITHUB_WORKSPACE. Defaults to workspace root (equivalent to ".").
	Path string `json:"path,omitempty"`

	// Token overrides the default GITHUB_TOKEN.
	// Use ${{ secrets.MY_TOKEN }} to reference a repository secret.
	// persist-credentials is always set to false regardless.
	Token string `json:"token,omitempty"`

	// FetchDepth is the number of commits to fetch.
	// 0 fetches all history. 1 (default) is a shallow clone.
	// When merging overlapping configs the deepest value wins.
	FetchDepth *int `json:"fetch-depth,omitempty"`

	// SparseCheckout enables sparse-checkout with newline-separated patterns.
	// Patterns are merged (unioned) across configs targeting the same path.
	SparseCheckout string `json:"sparse-checkout,omitempty"`

	// Submodules controls submodule checkout: "recursive", "true", or "false".
	Submodules string `json:"submodules,omitempty"`

	// LFS enables checkout of Git LFS objects.
	LFS bool `json:"lfs,omitempty"`
}

// checkoutKey is the grouping key for merging checkout configs.
// token is intentionally excluded from the key: two checkouts targeting the
// same repository+ref+path with different tokens still represent the same
// logical checkout; the first token seen wins.
type checkoutKey struct {
	repository string
	ref        string
	path       string
}

// resolvedCheckout is an internal merged checkout entry.
type resolvedCheckout struct {
	key            checkoutKey
	token          string   // custom GitHub token (first-seen wins when merging)
	fetchDepth     *int     // nil = use default (1)
	sparsePatterns []string // merged sparse-checkout patterns
	submodules     string
	lfs            bool
}

// CheckoutManager collects and deduplicates checkout configurations.
type CheckoutManager struct {
	// ordered preserves insertion order for deterministic YAML output
	ordered []*resolvedCheckout
	// index maps checkoutKey → position in ordered
	index map[checkoutKey]int
}

// NewCheckoutManager creates a CheckoutManager pre-loaded with user configs.
func NewCheckoutManager(configs []*CheckoutConfig) *CheckoutManager {
	cm := &CheckoutManager{index: make(map[checkoutKey]int)}
	for _, cfg := range configs {
		cm.add(cfg)
	}
	return cm
}

// add processes one CheckoutConfig, merging it into an existing entry if the
// (repository, ref, path) key matches a previously added config.
func (cm *CheckoutManager) add(cfg *CheckoutConfig) {
	if cfg == nil {
		return
	}
	key := checkoutKey{
		repository: cfg.Repository,
		ref:        cfg.Ref,
		path:       cfg.Path,
	}
	if idx, exists := cm.index[key]; exists {
		entry := cm.ordered[idx]
		entry.fetchDepth = deeperFetchDepth(entry.fetchDepth, cfg.FetchDepth)
		if cfg.SparseCheckout != "" {
			entry.sparsePatterns = mergeSparsePatterns(entry.sparsePatterns, cfg.SparseCheckout)
		}
		if cfg.LFS {
			entry.lfs = true
		}
		if cfg.Submodules != "" && entry.submodules == "" {
			entry.submodules = cfg.Submodules
		}
		// token: first-seen wins; ignore subsequent tokens for same target
		checkoutManagerLog.Printf("Merged checkout config for path=%q repository=%q", key.path, key.repository)
	} else {
		entry := &resolvedCheckout{
			key:        key,
			token:      cfg.Token,
			fetchDepth: cfg.FetchDepth,
			submodules: cfg.Submodules,
			lfs:        cfg.LFS,
		}
		if cfg.SparseCheckout != "" {
			entry.sparsePatterns = mergeSparsePatterns(nil, cfg.SparseCheckout)
		}
		cm.index[key] = len(cm.ordered)
		cm.ordered = append(cm.ordered, entry)
		checkoutManagerLog.Printf("Added checkout config for path=%q repository=%q", key.path, key.repository)
	}
}

// HasUserCheckouts returns true when the user provided at least one checkout config.
func (cm *CheckoutManager) HasUserCheckouts() bool {
	return len(cm.ordered) > 0
}

// defaultCheckoutOverride returns the resolved config for the default workspace
// (empty repository and empty path), or nil if the user did not configure one.
func (cm *CheckoutManager) defaultCheckoutOverride() *resolvedCheckout {
	key := checkoutKey{}
	if idx, ok := cm.index[key]; ok {
		return cm.ordered[idx]
	}
	return nil
}

// GenerateDefaultCheckoutStep emits YAML lines for the primary workspace checkout,
// applying any user-supplied overrides on top of the required security defaults.
//
// Security guarantee: persist-credentials is always set to false.
//
// trialMode / trialLogicalRepoSlug handle the special trial execution path.
// getActionPin resolves an action reference to a pinned SHA form.
//
// Returns a slice of YAML line strings (each ending with \n).
func (cm *CheckoutManager) GenerateDefaultCheckoutStep(
	trialMode bool,
	trialLogicalRepoSlug string,
	getActionPin func(string) string,
) []string {
	override := cm.defaultCheckoutOverride()

	var sb strings.Builder
	sb.WriteString("      - name: Checkout repository\n")
	fmt.Fprintf(&sb, "        uses: %s\n", getActionPin("actions/checkout"))
	sb.WriteString("        with:\n")
	// Security: always remove credentials so the agent cannot exfiltrate them.
	sb.WriteString("          persist-credentials: false\n")

	if trialMode {
		if trialLogicalRepoSlug != "" {
			fmt.Fprintf(&sb, "          repository: %s\n", trialLogicalRepoSlug)
		}
		effectiveToken := getEffectiveGitHubToken("")
		fmt.Fprintf(&sb, "          token: %s\n", effectiveToken)
	} else if override != nil {
		// Apply user overrides only when not in trial mode
		if override.key.repository != "" {
			fmt.Fprintf(&sb, "          repository: %s\n", override.key.repository)
		}
		if override.key.ref != "" {
			fmt.Fprintf(&sb, "          ref: %s\n", override.key.ref)
		}
		if override.token != "" {
			fmt.Fprintf(&sb, "          token: %s\n", override.token)
		}
		if override.fetchDepth != nil {
			fmt.Fprintf(&sb, "          fetch-depth: %d\n", *override.fetchDepth)
		}
		if len(override.sparsePatterns) > 0 {
			sb.WriteString("          sparse-checkout: |\n")
			for _, p := range override.sparsePatterns {
				fmt.Fprintf(&sb, "            %s\n", p)
			}
		}
		if override.submodules != "" {
			fmt.Fprintf(&sb, "          submodules: %s\n", override.submodules)
		}
		if override.lfs {
			sb.WriteString("          lfs: true\n")
		}
	}

	return []string{sb.String()}
}

// GenerateAdditionalCheckoutSteps emits YAML step strings for all non-default
// (additional) checkouts — those with a non-empty path or non-empty repository
// that don't represent the default workspace checkout.
//
// The caller is responsible for emitting the default workspace checkout separately
// via GenerateDefaultCheckoutStep.
func (cm *CheckoutManager) GenerateAdditionalCheckoutSteps(getActionPin func(string) string) []string {
	var out []string
	for _, entry := range cm.ordered {
		// Skip the default workspace checkout (handled separately)
		if entry.key.path == "" && entry.key.repository == "" {
			continue
		}
		out = append(out, generateResolvedCheckoutStepYAML(entry, getActionPin))
	}
	return out
}

// generateResolvedCheckoutStepYAML returns the YAML string for a single resolved checkout entry.
func generateResolvedCheckoutStepYAML(entry *resolvedCheckout, getActionPin func(string) string) string {
	name := checkoutStepLabel(entry.key)
	var sb strings.Builder
	fmt.Fprintf(&sb, "      - name: %s\n", name)
	fmt.Fprintf(&sb, "        uses: %s\n", getActionPin("actions/checkout"))
	sb.WriteString("        with:\n")
	// Security: always remove credentials
	sb.WriteString("          persist-credentials: false\n")
	if entry.key.repository != "" {
		fmt.Fprintf(&sb, "          repository: %s\n", entry.key.repository)
	}
	if entry.key.ref != "" {
		fmt.Fprintf(&sb, "          ref: %s\n", entry.key.ref)
	}
	if entry.key.path != "" {
		fmt.Fprintf(&sb, "          path: %s\n", entry.key.path)
	}
	if entry.token != "" {
		fmt.Fprintf(&sb, "          token: %s\n", entry.token)
	}
	if entry.fetchDepth != nil {
		fmt.Fprintf(&sb, "          fetch-depth: %d\n", *entry.fetchDepth)
	}
	if len(entry.sparsePatterns) > 0 {
		sb.WriteString("          sparse-checkout: |\n")
		for _, p := range entry.sparsePatterns {
			fmt.Fprintf(&sb, "            %s\n", p)
		}
	}
	if entry.submodules != "" {
		fmt.Fprintf(&sb, "          submodules: %s\n", entry.submodules)
	}
	if entry.lfs {
		sb.WriteString("          lfs: true\n")
	}
	return sb.String()
}

// checkoutStepLabel produces a human-readable step name for a non-default checkout.
func checkoutStepLabel(key checkoutKey) string {
	switch {
	case key.repository != "" && key.path != "":
		return "Checkout " + key.repository + " into " + key.path
	case key.repository != "":
		return "Checkout " + key.repository
	case key.path != "":
		return "Checkout into " + key.path
	default:
		return "Checkout repository"
	}
}

// deeperFetchDepth returns whichever fetch-depth value represents more history.
// 0 means full history and always wins; nil means "use default".
func deeperFetchDepth(a, b *int) *int {
	if a == nil && b == nil {
		return nil
	}
	if a == nil {
		return b
	}
	if b == nil {
		return a
	}
	if *a == 0 || *b == 0 {
		zero := 0
		return &zero
	}
	// For positive depths, larger = more history
	if *a > *b {
		return a
	}
	return b
}

// mergeSparsePatterns unions newline-separated patterns into an existing slice.
func mergeSparsePatterns(existing []string, newPatterns string) []string {
	seen := make(map[string]bool, len(existing))
	result := make([]string, 0, len(existing))
	for _, p := range existing {
		p = strings.TrimSpace(p)
		if p != "" && !seen[p] {
			seen[p] = true
			result = append(result, p)
		}
	}
	for p := range strings.SplitSeq(newPatterns, "\n") {
		p = strings.TrimSpace(p)
		if p != "" && !seen[p] {
			seen[p] = true
			result = append(result, p)
		}
	}
	return result
}

// ParseCheckoutConfigs converts a raw frontmatter value (single map or array of maps)
// into a slice of CheckoutConfig. Returns nil when raw is nil.
func ParseCheckoutConfigs(raw any) ([]*CheckoutConfig, error) {
	if raw == nil {
		return nil, nil
	}
	// Single object
	if m, ok := raw.(map[string]any); ok {
		cfg, err := checkoutConfigFromMap(m)
		if err != nil {
			return nil, fmt.Errorf("invalid checkout configuration: %w", err)
		}
		return []*CheckoutConfig{cfg}, nil
	}
	// Array of objects
	if arr, ok := raw.([]any); ok {
		configs := make([]*CheckoutConfig, 0, len(arr))
		for i, item := range arr {
			itemMap, ok := item.(map[string]any)
			if !ok {
				return nil, fmt.Errorf("checkout[%d]: expected object, got %T", i, item)
			}
			cfg, err := checkoutConfigFromMap(itemMap)
			if err != nil {
				return nil, fmt.Errorf("checkout[%d]: %w", i, err)
			}
			configs = append(configs, cfg)
		}
		return configs, nil
	}
	return nil, fmt.Errorf("checkout must be an object or array of objects, got %T", raw)
}

// checkoutConfigFromMap converts a raw map to a CheckoutConfig.
func checkoutConfigFromMap(m map[string]any) (*CheckoutConfig, error) {
	cfg := &CheckoutConfig{}
	for k, v := range m {
		switch k {
		case "repository":
			s, ok := v.(string)
			if !ok {
				return nil, errors.New("checkout.repository must be a string")
			}
			cfg.Repository = s
		case "ref":
			s, ok := v.(string)
			if !ok {
				return nil, errors.New("checkout.ref must be a string")
			}
			cfg.Ref = s
		case "path":
			s, ok := v.(string)
			if !ok {
				return nil, errors.New("checkout.path must be a string")
			}
			cfg.Path = s
		case "token":
			s, ok := v.(string)
			if !ok {
				return nil, errors.New("checkout.token must be a string")
			}
			cfg.Token = s
		case "fetch-depth":
			switch n := v.(type) {
			case int:
				depth := n
				cfg.FetchDepth = &depth
			case float64:
				depth := int(n)
				cfg.FetchDepth = &depth
			default:
				return nil, fmt.Errorf("checkout.fetch-depth must be an integer, got %T", v)
			}
		case "sparse-checkout":
			s, ok := v.(string)
			if !ok {
				return nil, errors.New("checkout.sparse-checkout must be a string")
			}
			cfg.SparseCheckout = s
		case "submodules":
			switch sv := v.(type) {
			case string:
				cfg.Submodules = sv
			case bool:
				if sv {
					cfg.Submodules = "true"
				} else {
					cfg.Submodules = "false"
				}
			default:
				return nil, errors.New("checkout.submodules must be a string or boolean")
			}
		case "lfs":
			b, ok := v.(bool)
			if !ok {
				return nil, errors.New("checkout.lfs must be a boolean")
			}
			cfg.LFS = b
		default:
			return nil, fmt.Errorf("checkout: unknown field %q", k)
		}
	}
	return cfg, nil
}
