//go:build !integration

package workflow

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// --------------------------------------------------------------------------
// ParseCheckoutConfigs
// --------------------------------------------------------------------------

func TestParseCheckoutConfigs_nil(t *testing.T) {
	configs, err := ParseCheckoutConfigs(nil)
	require.NoError(t, err, "nil input should produce no error")
	assert.Nil(t, configs, "nil input should produce nil configs")
}

func TestParseCheckoutConfigs_singleObject(t *testing.T) {
	raw := map[string]any{
		"repository":  "owner/repo",
		"ref":         "main",
		"fetch-depth": float64(0),
		"token":       "${{ secrets.MY_PAT }}",
	}
	configs, err := ParseCheckoutConfigs(raw)
	require.NoError(t, err, "single object should parse without error")
	require.Len(t, configs, 1, "should produce one config")
	assert.Equal(t, "owner/repo", configs[0].Repository)
	assert.Equal(t, "main", configs[0].Ref)
	assert.Equal(t, "${{ secrets.MY_PAT }}", configs[0].Token)
	require.NotNil(t, configs[0].FetchDepth)
	assert.Equal(t, 0, *configs[0].FetchDepth)
}

func TestParseCheckoutConfigs_arrayOfObjects(t *testing.T) {
	raw := []any{
		map[string]any{"path": ".", "fetch-depth": float64(1)},
		map[string]any{"repository": "org/lib", "path": "./libs/lib", "ref": "v2.0"},
	}
	configs, err := ParseCheckoutConfigs(raw)
	require.NoError(t, err, "array of objects should parse without error")
	require.Len(t, configs, 2, "should produce two configs")
	assert.Equal(t, ".", configs[0].Path)
	assert.Equal(t, "org/lib", configs[1].Repository)
	assert.Equal(t, "./libs/lib", configs[1].Path)
	assert.Equal(t, "v2.0", configs[1].Ref)
}

func TestParseCheckoutConfigs_invalidType(t *testing.T) {
	_, err := ParseCheckoutConfigs("not-an-object")
	assert.Error(t, err, "non-map/non-array should return error")
}

func TestParseCheckoutConfigs_unknownField(t *testing.T) {
	raw := map[string]any{
		"unknown-field": "value",
	}
	_, err := ParseCheckoutConfigs(raw)
	assert.Error(t, err, "unknown field should return error")
}

func TestParseCheckoutConfigs_sparseCheckout(t *testing.T) {
	raw := map[string]any{
		"sparse-checkout": ".github/\nsrc/",
	}
	configs, err := ParseCheckoutConfigs(raw)
	require.NoError(t, err)
	require.Len(t, configs, 1)
	assert.Equal(t, ".github/\nsrc/", configs[0].SparseCheckout)
}

func TestParseCheckoutConfigs_submodulesBool(t *testing.T) {
	raw := map[string]any{"submodules": true}
	configs, err := ParseCheckoutConfigs(raw)
	require.NoError(t, err)
	assert.Equal(t, "true", configs[0].Submodules)
}

func TestParseCheckoutConfigs_submodulesString(t *testing.T) {
	raw := map[string]any{"submodules": "recursive"}
	configs, err := ParseCheckoutConfigs(raw)
	require.NoError(t, err)
	assert.Equal(t, "recursive", configs[0].Submodules)
}

func TestParseCheckoutConfigs_lfs(t *testing.T) {
	raw := map[string]any{"lfs": true}
	configs, err := ParseCheckoutConfigs(raw)
	require.NoError(t, err)
	assert.True(t, configs[0].LFS)
}

// --------------------------------------------------------------------------
// deeperFetchDepth
// --------------------------------------------------------------------------

func TestDeeperFetchDepth(t *testing.T) {
	tests := []struct {
		name    string
		a       *int
		b       *int
		wantNil bool
		wantVal int
	}{
		{"both nil", nil, nil, true, 0},
		{"a nil, b=1", nil, intPtr(1), false, 1},
		{"a=1, b nil", intPtr(1), nil, false, 1},
		{"a=0 wins over b=5", intPtr(0), intPtr(5), false, 0},
		{"b=0 wins over a=3", intPtr(3), intPtr(0), false, 0},
		{"both 0", intPtr(0), intPtr(0), false, 0},
		{"a=10 > b=5", intPtr(10), intPtr(5), false, 10},
		{"a=5 < b=10", intPtr(5), intPtr(10), false, 10},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := deeperFetchDepth(tt.a, tt.b)
			if tt.wantNil {
				assert.Nil(t, got, "expected nil result")
			} else {
				require.NotNil(t, got)
				assert.Equal(t, tt.wantVal, *got)
			}
		})
	}
}

// --------------------------------------------------------------------------
// mergeSparsePatterns
// --------------------------------------------------------------------------

func TestMergeSparsePatterns(t *testing.T) {
	got := mergeSparsePatterns([]string{".github/", "src/"}, "src/\ndocs/")
	assert.Equal(t, []string{".github/", "src/", "docs/"}, got, "should deduplicate and preserve order")
}

func TestMergeSparsePatternsEmpty(t *testing.T) {
	got := mergeSparsePatterns(nil, ".github/\n")
	assert.Equal(t, []string{".github/"}, got)
}

// --------------------------------------------------------------------------
// CheckoutManager
// --------------------------------------------------------------------------

func TestCheckoutManager_noConfigs(t *testing.T) {
	cm := NewCheckoutManager(nil)
	assert.False(t, cm.HasUserCheckouts(), "no configs means no user checkouts")
	assert.Empty(t, cm.GenerateAdditionalCheckoutSteps(GetActionPin), "no additional steps")
}

func TestCheckoutManager_defaultCheckoutOverride(t *testing.T) {
	depth := 0
	cfg := &CheckoutConfig{FetchDepth: &depth, Token: "${{ secrets.MY_PAT }}"}
	cm := NewCheckoutManager([]*CheckoutConfig{cfg})
	assert.True(t, cm.HasUserCheckouts())
	override := cm.defaultCheckoutOverride()
	require.NotNil(t, override, "config with no path/repository should be treated as default override")
	assert.Equal(t, 0, *override.fetchDepth)
	assert.Equal(t, "${{ secrets.MY_PAT }}", override.token, "token should be stored in the entry")
}

func TestCheckoutManager_mergesMatchingKeys(t *testing.T) {
	depth1 := 5
	depth2 := 0
	cm := NewCheckoutManager([]*CheckoutConfig{
		{Repository: "org/repo", Path: "./out", FetchDepth: &depth1, SparseCheckout: ".github/"},
		{Repository: "org/repo", Path: "./out", FetchDepth: &depth2, SparseCheckout: "src/"},
	})
	// Should have merged into one entry
	assert.Len(t, cm.ordered, 1, "duplicate key should be merged")
	entry := cm.ordered[0]
	assert.Equal(t, 0, *entry.fetchDepth, "deepest fetch-depth (0) should win")
	assert.Equal(t, []string{".github/", "src/"}, entry.sparsePatterns, "patterns should be merged")
}

func TestCheckoutManager_separateKeys(t *testing.T) {
	cm := NewCheckoutManager([]*CheckoutConfig{
		{Path: "./a"},
		{Path: "./b"},
	})
	assert.Len(t, cm.ordered, 2, "different paths should produce separate entries")
}

// --------------------------------------------------------------------------
// GenerateDefaultCheckoutStep
// --------------------------------------------------------------------------

func TestGenerateDefaultCheckoutStep_noOverride(t *testing.T) {
	cm := NewCheckoutManager(nil)
	lines := cm.GenerateDefaultCheckoutStep(false, "", GetActionPin)
	require.Len(t, lines, 1)
	step := lines[0]
	assert.Contains(t, step, "Checkout repository", "step name should be present")
	assert.Contains(t, step, "actions/checkout", "uses should reference actions/checkout")
	assert.Contains(t, step, "persist-credentials: false", "credentials must always be removed")
	assert.NotContains(t, step, "token:", "no token when no override and not trial mode")
	assert.NotContains(t, step, "fetch-depth:", "no fetch-depth when no override")
}

func TestGenerateDefaultCheckoutStep_withFetchDepth(t *testing.T) {
	depth := 0
	cm := NewCheckoutManager([]*CheckoutConfig{{FetchDepth: &depth}})
	lines := cm.GenerateDefaultCheckoutStep(false, "", GetActionPin)
	require.Len(t, lines, 1)
	assert.Contains(t, lines[0], "fetch-depth: 0", "fetch-depth override should be emitted")
}

func TestGenerateDefaultCheckoutStep_withToken(t *testing.T) {
	cm := NewCheckoutManager([]*CheckoutConfig{{Token: "${{ secrets.MY_PAT }}"}})
	lines := cm.GenerateDefaultCheckoutStep(false, "", GetActionPin)
	require.Len(t, lines, 1)
	assert.Contains(t, lines[0], "token: ${{ secrets.MY_PAT }}", "custom token should be emitted")
}

func TestGenerateDefaultCheckoutStep_trialModeOverridesUserToken(t *testing.T) {
	// In trial mode, the trial logic takes precedence over user-supplied token
	cm := NewCheckoutManager([]*CheckoutConfig{{Token: "${{ secrets.MY_PAT }}"}})
	lines := cm.GenerateDefaultCheckoutStep(true, "owner/repo", GetActionPin)
	require.Len(t, lines, 1)
	step := lines[0]
	// Trial mode sets repository from trialLogicalRepoSlug
	assert.Contains(t, step, "repository: owner/repo")
	// Trial mode sets its own token (getEffectiveGitHubToken), not the user token
	assert.NotContains(t, step, "secrets.MY_PAT", "user token must not appear in trial mode")
}

func TestGenerateDefaultCheckoutStep_withSparseCheckout(t *testing.T) {
	cm := NewCheckoutManager([]*CheckoutConfig{{SparseCheckout: ".github/\nsrc/"}})
	lines := cm.GenerateDefaultCheckoutStep(false, "", GetActionPin)
	require.Len(t, lines, 1)
	assert.Contains(t, lines[0], "sparse-checkout: |", "sparse-checkout header should be present")
	assert.Contains(t, lines[0], ".github/", "sparse pattern should be present")
	assert.Contains(t, lines[0], "src/", "sparse pattern should be present")
}

func TestGenerateDefaultCheckoutStep_withLFS(t *testing.T) {
	cm := NewCheckoutManager([]*CheckoutConfig{{LFS: true}})
	lines := cm.GenerateDefaultCheckoutStep(false, "", GetActionPin)
	require.Len(t, lines, 1)
	assert.Contains(t, lines[0], "lfs: true", "LFS flag should be emitted")
}

func TestGenerateDefaultCheckoutStep_persistCredentialsFalseAlways(t *testing.T) {
	// Even with a token set, persist-credentials must be false
	cm := NewCheckoutManager([]*CheckoutConfig{{Token: "${{ secrets.PAT }}"}})
	lines := cm.GenerateDefaultCheckoutStep(false, "", GetActionPin)
	require.Len(t, lines, 1)
	assert.Contains(t, lines[0], "persist-credentials: false", "persist-credentials must always be false")
}

// --------------------------------------------------------------------------
// GenerateAdditionalCheckoutSteps
// --------------------------------------------------------------------------

func TestGenerateAdditionalCheckoutSteps_skipsDefault(t *testing.T) {
	// A config with no path and no repository is the "default" and must not appear here
	cm := NewCheckoutManager([]*CheckoutConfig{{FetchDepth: intPtr(0)}})
	additional := cm.GenerateAdditionalCheckoutSteps(GetActionPin)
	assert.Empty(t, additional, "default checkout must not appear in additional steps")
}

func TestGenerateAdditionalCheckoutSteps_emitsNonDefault(t *testing.T) {
	cm := NewCheckoutManager([]*CheckoutConfig{
		{Repository: "org/lib", Path: "./libs/lib", Ref: "v2.0"},
	})
	additional := cm.GenerateAdditionalCheckoutSteps(GetActionPin)
	require.Len(t, additional, 1, "one non-default checkout should produce one step")
	step := additional[0]
	assert.Contains(t, step, "actions/checkout", "step must use actions/checkout")
	assert.Contains(t, step, "persist-credentials: false", "credentials must always be removed")
	assert.Contains(t, step, "repository: org/lib")
	assert.Contains(t, step, "path: ./libs/lib")
	assert.Contains(t, step, "ref: v2.0")
}

func TestGenerateAdditionalCheckoutSteps_multipleCheckouts(t *testing.T) {
	cm := NewCheckoutManager([]*CheckoutConfig{
		{FetchDepth: intPtr(0)}, // default - should not appear here
		{Repository: "org/a", Path: "./a"},
		{Repository: "org/b", Path: "./b", Ref: "develop"},
	})
	additional := cm.GenerateAdditionalCheckoutSteps(GetActionPin)
	require.Len(t, additional, 2, "two non-default checkouts should produce two steps")
	assert.Contains(t, additional[0], "org/a", "first step should checkout org/a")
	assert.Contains(t, additional[1], "org/b", "second step should checkout org/b")
}

// --------------------------------------------------------------------------
// checkoutStepLabel
// --------------------------------------------------------------------------

func TestCheckoutStepLabel(t *testing.T) {
	tests := []struct {
		key      checkoutKey
		expected string
	}{
		{checkoutKey{repository: "org/repo", path: "./out"}, "Checkout org/repo into ./out"},
		{checkoutKey{repository: "org/repo"}, "Checkout org/repo"},
		{checkoutKey{path: "./out"}, "Checkout into ./out"},
		{checkoutKey{}, "Checkout repository"},
	}
	for _, tt := range tests {
		t.Run(tt.expected, func(t *testing.T) {
			assert.Equal(t, tt.expected, checkoutStepLabel(tt.key))
		})
	}
}
