//go:build !integration

package workflow

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestParseCheckoutConfig exercises the frontmatter checkout field parser.
func TestParseCheckoutConfig(t *testing.T) {
	tests := []struct {
		name        string
		raw         any
		wantLen     int
		wantRoot    bool // whether first item is a root checkout
		wantErr     bool
		checkFirst  func(t *testing.T, item *CheckoutItemConfig)
		checkSecond func(t *testing.T, item *CheckoutItemConfig)
	}{
		{
			name: "nil input returns empty",
			raw:  nil,
		},
		{
			name:     "single object form - default checkout only",
			raw:      map[string]any{"fetch-depth": float64(0)},
			wantLen:  1,
			wantRoot: true,
			checkFirst: func(t *testing.T, item *CheckoutItemConfig) {
				require.NotNil(t, item.FetchDepth, "FetchDepth should be set")
				assert.Equal(t, 0, *item.FetchDepth, "FetchDepth should be 0")
				assert.Empty(t, item.Repository, "Repository should be empty for root checkout")
				assert.Empty(t, item.CheckoutDir, "CheckoutDir should be empty for root checkout")
			},
		},
		{
			name: "single object form - with token and ref",
			raw: map[string]any{
				"github-token": "${{ secrets.MY_TOKEN }}",
				"ref":          "main",
			},
			wantLen:  1,
			wantRoot: true,
			checkFirst: func(t *testing.T, item *CheckoutItemConfig) {
				assert.Equal(t, "${{ secrets.MY_TOKEN }}", item.Token, "Token should match")
				assert.Equal(t, "main", item.Ref, "Ref should match")
			},
		},
		{
			name: "single object form - with submodules and LFS",
			raw: map[string]any{
				"submodules": "recursive",
				"lfs":        true,
			},
			wantLen:  1,
			wantRoot: true,
			checkFirst: func(t *testing.T, item *CheckoutItemConfig) {
				assert.Equal(t, "recursive", item.Submodules, "Submodules should match")
				assert.True(t, item.LFS, "LFS should be true")
			},
		},
		{
			name: "array form - root config only",
			raw: []any{
				map[string]any{"fetch-depth": float64(5)},
			},
			wantLen:  1,
			wantRoot: true,
			checkFirst: func(t *testing.T, item *CheckoutItemConfig) {
				require.NotNil(t, item.FetchDepth, "FetchDepth should be set")
				assert.Equal(t, 5, *item.FetchDepth, "FetchDepth should be 5")
			},
		},
		{
			name: "array form - root plus additional checkout",
			raw: []any{
				map[string]any{"fetch-depth": float64(0)},
				map[string]any{
					"repository":   "owner/other-repo",
					"checkout-dir": "./other-repo",
					"ref":          "v2.0",
				},
			},
			wantLen:  2,
			wantRoot: true,
			checkFirst: func(t *testing.T, item *CheckoutItemConfig) {
				require.NotNil(t, item.FetchDepth, "FetchDepth should be set")
				assert.Equal(t, 0, *item.FetchDepth)
				assert.True(t, item.isRootCheckout(), "First item should be root checkout")
			},
			checkSecond: func(t *testing.T, item *CheckoutItemConfig) {
				assert.Equal(t, "owner/other-repo", item.Repository)
				assert.Equal(t, "./other-repo", item.CheckoutDir)
				assert.Equal(t, "v2.0", item.Ref)
				assert.False(t, item.isRootCheckout(), "Second item should not be root checkout")
			},
		},
		{
			name: "array form - additional checkout only (no root config)",
			raw: []any{
				map[string]any{
					"repository":   "org/private-repo",
					"checkout-dir": "libs/private",
					"github-token": "${{ secrets.PRIVATE_TOKEN }}",
				},
			},
			wantLen: 1,
			checkFirst: func(t *testing.T, item *CheckoutItemConfig) {
				assert.Equal(t, "org/private-repo", item.Repository)
				assert.Equal(t, "libs/private", item.CheckoutDir)
				assert.Equal(t, "${{ secrets.PRIVATE_TOKEN }}", item.Token)
				assert.False(t, item.isRootCheckout())
			},
		},
		{
			name:    "invalid type returns error",
			raw:     "not-a-map-or-array",
			wantErr: true,
		},
		{
			name:    "array with non-object element returns error",
			raw:     []any{"not-an-object"},
			wantErr: true,
		},
		{
			name:    "fetch-depth 5 is parsed",
			raw:     map[string]any{"fetch-depth": float64(5)},
			wantLen: 1,
			checkFirst: func(t *testing.T, item *CheckoutItemConfig) {
				require.NotNil(t, item.FetchDepth)
				assert.Equal(t, 5, *item.FetchDepth)
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseCheckoutConfig(tt.raw)

			if tt.wantErr {
				assert.Error(t, err, "expected an error")
				return
			}
			require.NoError(t, err, "unexpected error")

			if tt.wantLen == 0 {
				assert.Empty(t, got, "expected empty result")
				return
			}

			require.Len(t, got, tt.wantLen, "unexpected number of items")

			if tt.wantRoot {
				assert.True(t, got[0].isRootCheckout(), "first item should be root checkout")
			}

			if tt.checkFirst != nil {
				tt.checkFirst(t, got[0])
			}
			if tt.checkSecond != nil && len(got) > 1 {
				tt.checkSecond(t, got[1])
			}
		})
	}
}

// TestCheckoutManagerSetFetchDepth tests the deepest-fetch-depth semantics.
func TestCheckoutManagerSetFetchDepth(t *testing.T) {
	tests := []struct {
		name    string
		depths  []int
		want    int
		wantSet bool
	}{
		{
			name:    "single depth 1",
			depths:  []int{1},
			want:    1,
			wantSet: true,
		},
		{
			name:    "single depth 0 (unlimited)",
			depths:  []int{0},
			want:    0,
			wantSet: true,
		},
		{
			name:    "depth 1 then 5 - 5 wins (deeper history)",
			depths:  []int{1, 5},
			want:    5,
			wantSet: true,
		},
		{
			name:    "depth 5 then 1 - 5 stays",
			depths:  []int{5, 1},
			want:    5,
			wantSet: true,
		},
		{
			name:    "depth 0 then any positive - 0 wins (unlimited)",
			depths:  []int{0, 100},
			want:    0,
			wantSet: true,
		},
		{
			name:    "positive then 0 - 0 wins",
			depths:  []int{10, 0},
			want:    0,
			wantSet: true,
		},
		{
			name:    "no depths - not set",
			depths:  nil,
			wantSet: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mgr := NewCheckoutManager(false, "", false)
			for _, d := range tt.depths {
				mgr.setFetchDepth(d)
			}
			assert.Equal(t, tt.wantSet, mgr.fetchDepthSet, "fetchDepthSet mismatch")
			if tt.wantSet {
				assert.Equal(t, tt.want, mgr.fetchDepth, "fetchDepth mismatch")
			}
		})
	}
}

// TestCheckoutManagerApplyUserCheckouts tests that user config is applied correctly.
func TestCheckoutManagerApplyUserCheckouts(t *testing.T) {
	depth0 := 0
	depth3 := 3

	tests := []struct {
		name         string
		items        []*CheckoutItemConfig
		wantToken    string
		wantRef      string
		wantFetch    int
		wantFetchSet bool
		wantAddnl    int
	}{
		{
			name:  "nil items - no change",
			items: nil,
		},
		{
			name:         "root checkout with token",
			items:        []*CheckoutItemConfig{{Token: "${{ secrets.T }}"}},
			wantToken:    "${{ secrets.T }}",
			wantFetchSet: false,
		},
		{
			name:         "root checkout with fetch-depth 0",
			items:        []*CheckoutItemConfig{{FetchDepth: &depth0}},
			wantFetch:    0,
			wantFetchSet: true,
		},
		{
			name:         "root checkout with fetch-depth 3",
			items:        []*CheckoutItemConfig{{FetchDepth: &depth3}},
			wantFetch:    3,
			wantFetchSet: true,
		},
		{
			name: "root checkout + one additional",
			items: []*CheckoutItemConfig{
				{Ref: "main"},
				{Repository: "owner/repo", CheckoutDir: "./repo"},
			},
			wantRef:   "main",
			wantAddnl: 1,
		},
		{
			name: "two additional checkouts (no root config)",
			items: []*CheckoutItemConfig{
				{Repository: "a/b", CheckoutDir: "./b"},
				{Repository: "c/d", CheckoutDir: "./d"},
			},
			wantAddnl: 2,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mgr := NewCheckoutManager(false, "", false)
			mgr.ApplyUserCheckouts(tt.items)

			assert.Equal(t, tt.wantToken, mgr.token, "token mismatch")
			assert.Equal(t, tt.wantRef, mgr.ref, "ref mismatch")
			assert.Equal(t, tt.wantFetchSet, mgr.fetchDepthSet, "fetchDepthSet mismatch")
			if tt.wantFetchSet {
				assert.Equal(t, tt.wantFetch, mgr.fetchDepth, "fetchDepth mismatch")
			}
			assert.Len(t, mgr.additionals, tt.wantAddnl, "additionals count mismatch")
		})
	}
}

// TestCheckoutManagerGenerateRootCheckoutStep verifies the emitted YAML for the root checkout.
func TestCheckoutManagerGenerateRootCheckoutStep(t *testing.T) {
	depth0 := 0

	tests := []struct {
		name           string
		manager        func() *CheckoutManager
		expectContains []string
		expectAbsent   []string
	}{
		{
			name:    "default settings - minimal output",
			manager: func() *CheckoutManager { return NewCheckoutManager(false, "", false) },
			expectContains: []string{
				"- name: Checkout repository",
				"uses: actions/checkout@",
				"persist-credentials: false",
			},
			expectAbsent: []string{
				"fetch-depth:",
				"token:",
				"ref:",
				"submodules:",
				"lfs:",
			},
		},
		{
			name: "fetch-depth 0",
			manager: func() *CheckoutManager {
				m := NewCheckoutManager(false, "", false)
				m.setFetchDepth(0)
				return m
			},
			expectContains: []string{
				"fetch-depth: 0",
				"persist-credentials: false",
			},
		},
		{
			name: "fetch-depth 5",
			manager: func() *CheckoutManager {
				m := NewCheckoutManager(false, "", false)
				m.setFetchDepth(5)
				return m
			},
			expectContains: []string{"fetch-depth: 5"},
		},
		{
			name: "custom token",
			manager: func() *CheckoutManager {
				m := NewCheckoutManager(false, "", false)
				m.token = "${{ secrets.MY_TOKEN }}"
				return m
			},
			expectContains: []string{"token: ${{ secrets.MY_TOKEN }}"},
		},
		{
			name: "custom ref",
			manager: func() *CheckoutManager {
				m := NewCheckoutManager(false, "", false)
				m.ref = "v2.0.0"
				return m
			},
			expectContains: []string{"ref: v2.0.0"},
		},
		{
			name: "submodules recursive",
			manager: func() *CheckoutManager {
				m := NewCheckoutManager(false, "", false)
				m.submodules = "recursive"
				return m
			},
			expectContains: []string{"submodules: recursive"},
		},
		{
			name: "lfs enabled",
			manager: func() *CheckoutManager {
				m := NewCheckoutManager(false, "", false)
				m.lfs = true
				return m
			},
			expectContains: []string{"lfs: true"},
		},
		{
			name: "trial mode with logical repo",
			manager: func() *CheckoutManager {
				return NewCheckoutManager(true, "myorg/myrepo", false)
			},
			expectContains: []string{
				"repository: myorg/myrepo",
				"token:", // effective token always emitted in trial mode
				"persist-credentials: false",
			},
		},
		{
			name: "trial mode without logical repo",
			manager: func() *CheckoutManager {
				return NewCheckoutManager(true, "", false)
			},
			expectContains: []string{
				"token:", // effective token always emitted in trial mode
				"persist-credentials: false",
			},
			expectAbsent: []string{"repository:"},
		},
		{
			name: "all options combined",
			manager: func() *CheckoutManager {
				m := NewCheckoutManager(false, "", false)
				m.token = "${{ secrets.T }}"
				m.ref = "release/v3"
				m.setFetchDepth(depth0)
				m.submodules = "true"
				m.lfs = true
				return m
			},
			expectContains: []string{
				"token: ${{ secrets.T }}",
				"ref: release/v3",
				"fetch-depth: 0",
				"submodules: true",
				"lfs: true",
				"persist-credentials: false",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mgr := tt.manager()
			var buf strings.Builder
			mgr.GenerateRootCheckoutStep(&buf)
			result := buf.String()

			for _, expected := range tt.expectContains {
				assert.Contains(t, result, expected, "output should contain %q", expected)
			}
			for _, absent := range tt.expectAbsent {
				assert.NotContains(t, result, absent, "output should NOT contain %q", absent)
			}
		})
	}
}

// TestCheckoutManagerGenerateAdditionalCheckoutSteps verifies YAML for additional checkouts.
func TestCheckoutManagerGenerateAdditionalCheckoutSteps(t *testing.T) {
	tests := []struct {
		name           string
		additionals    []*CheckoutItemConfig
		expectContains []string
		expectAbsent   []string
	}{
		{
			name:         "no additionals - no output",
			additionals:  nil,
			expectAbsent: []string{"actions/checkout"},
		},
		{
			name: "single additional checkout",
			additionals: []*CheckoutItemConfig{
				{
					Repository:  "owner/repo",
					CheckoutDir: "./repo",
					Ref:         "main",
					Token:       "${{ secrets.T }}",
				},
			},
			expectContains: []string{
				"- name: Checkout owner/repo",
				"uses: actions/checkout@",
				"persist-credentials: false",
				"repository: owner/repo",
				"path: ./repo",
				"ref: main",
				"token: ${{ secrets.T }}",
			},
		},
		{
			name: "checkout with fetch-depth",
			additionals: []*CheckoutItemConfig{
				{
					Repository:  "a/b",
					CheckoutDir: "./b",
					FetchDepth:  func() *int { v := 10; return &v }(),
				},
			},
			expectContains: []string{"fetch-depth: 10"},
		},
		{
			name: "checkout with submodules and lfs",
			additionals: []*CheckoutItemConfig{
				{
					Repository:  "a/b",
					CheckoutDir: "./b",
					Submodules:  "recursive",
					LFS:         true,
				},
			},
			expectContains: []string{
				"submodules: recursive",
				"lfs: true",
			},
		},
		{
			name: "multiple additional checkouts",
			additionals: []*CheckoutItemConfig{
				{Repository: "a/b", CheckoutDir: "./b"},
				{Repository: "c/d", CheckoutDir: "./d"},
			},
			expectContains: []string{
				"Checkout a/b",
				"Checkout c/d",
				"path: ./b",
				"path: ./d",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mgr := NewCheckoutManager(false, "", false)
			mgr.additionals = tt.additionals

			var buf strings.Builder
			mgr.GenerateAdditionalCheckoutSteps(&buf)
			result := buf.String()

			for _, expected := range tt.expectContains {
				assert.Contains(t, result, expected, "output should contain %q", expected)
			}
			for _, absent := range tt.expectAbsent {
				assert.NotContains(t, result, absent, "output should NOT contain %q", absent)
			}
		})
	}
}

// TestCheckoutManagerHasAdditionalCheckouts tests the HasAdditionalCheckouts predicate.
func TestCheckoutManagerHasAdditionalCheckouts(t *testing.T) {
	mgr := NewCheckoutManager(false, "", false)
	assert.False(t, mgr.HasAdditionalCheckouts(), "empty manager should have no additionals")

	mgr.additionals = []*CheckoutItemConfig{{Repository: "a/b", CheckoutDir: "./b"}}
	assert.True(t, mgr.HasAdditionalCheckouts(), "manager with additionals should return true")
}

// TestGenerateMainJobStepsWithCheckoutConfig verifies that CheckoutConfig from WorkflowData
// is applied when generating the main job steps.
func TestGenerateMainJobStepsWithCheckoutConfig(t *testing.T) {
	depth0 := 0
	depth2 := 2

	tests := []struct {
		name           string
		checkoutConfig []*CheckoutItemConfig
		expectContains []string
		expectAbsent   []string
	}{
		{
			name:           "no checkout config - default minimal checkout",
			checkoutConfig: nil,
			expectContains: []string{
				"- name: Checkout repository",
				"persist-credentials: false",
			},
			expectAbsent: []string{
				"fetch-depth:",
			},
		},
		{
			name: "root config with fetch-depth 0",
			checkoutConfig: []*CheckoutItemConfig{
				{FetchDepth: &depth0},
			},
			expectContains: []string{
				"- name: Checkout repository",
				"fetch-depth: 0",
				"persist-credentials: false",
			},
		},
		{
			name: "root config with fetch-depth 2",
			checkoutConfig: []*CheckoutItemConfig{
				{FetchDepth: &depth2},
			},
			expectContains: []string{
				"fetch-depth: 2",
			},
		},
		{
			name: "root config with custom ref",
			checkoutConfig: []*CheckoutItemConfig{
				{Ref: "release/v2"},
			},
			expectContains: []string{"ref: release/v2"},
		},
		{
			name: "root config with custom token",
			checkoutConfig: []*CheckoutItemConfig{
				{Token: "${{ secrets.CHECKOUT_TOKEN }}"},
			},
			expectContains: []string{"token: ${{ secrets.CHECKOUT_TOKEN }}"},
		},
		{
			name: "additional checkout only",
			checkoutConfig: []*CheckoutItemConfig{
				{Repository: "org/lib", CheckoutDir: "./lib", Ref: "v1.0"},
			},
			expectContains: []string{
				"- name: Checkout repository", // default checkout still emitted
				"- name: Checkout org/lib",    // additional checkout
				"repository: org/lib",
				"path: ./lib",
				"ref: v1.0",
			},
		},
		{
			name: "root config plus additional checkout",
			checkoutConfig: []*CheckoutItemConfig{
				{FetchDepth: &depth0},
				{Repository: "org/lib", CheckoutDir: "./lib"},
			},
			expectContains: []string{
				"fetch-depth: 0",
				"- name: Checkout org/lib",
				"path: ./lib",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			compiler := NewCompiler()
			compiler.stepOrderTracker = NewStepOrderTracker()

			data := &WorkflowData{
				Name:            "Test Workflow",
				AI:              "copilot",
				MarkdownContent: "Test prompt",
				CheckoutConfig:  tt.checkoutConfig,
				EngineConfig:    &EngineConfig{ID: "copilot"},
				ParsedTools:     &ToolsConfig{},
			}

			var buf strings.Builder
			err := compiler.generateMainJobSteps(&buf, data)
			require.NoError(t, err, "generateMainJobSteps should not error")
			result := buf.String()

			for _, expected := range tt.expectContains {
				assert.Contains(t, result, expected, "output should contain %q", expected)
			}
			for _, absent := range tt.expectAbsent {
				assert.NotContains(t, result, absent, "output should NOT contain %q", absent)
			}
		})
	}
}
