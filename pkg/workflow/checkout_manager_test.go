//go:build !integration

package workflow

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// parseCheckoutConfig
// ---------------------------------------------------------------------------

func TestParseCheckoutConfig(t *testing.T) {
	tests := []struct {
		name           string
		input          any
		wantDisabled   bool
		wantEntriesLen int
		wantFirstRepo  string
		wantFirstPath  string
		wantFirstFetch *int
		wantErr        bool
	}{
		{
			name:         "false disables checkout",
			input:        false,
			wantDisabled: true,
		},
		{
			name:         "true leaves checkout enabled with no entries",
			input:        true,
			wantDisabled: false,
		},
		{
			name:           "empty object produces one default entry",
			input:          map[string]any{},
			wantEntriesLen: 1,
			wantFirstRepo:  "",
			wantFirstPath:  "",
			wantFirstFetch: nil,
		},
		{
			name: "object with fetch-depth",
			input: map[string]any{
				"fetch-depth": float64(0),
			},
			wantEntriesLen: 1,
			wantFirstFetch: intPtr(0),
		},
		{
			name: "object with repository and path",
			input: map[string]any{
				"repository": "owner/repo",
				"path":       "vendor/repo",
			},
			wantEntriesLen: 1,
			wantFirstRepo:  "owner/repo",
			wantFirstPath:  "vendor/repo",
		},
		{
			name: "array of objects produces multiple entries",
			input: []any{
				map[string]any{"fetch-depth": float64(0)},
				map[string]any{"repository": "owner/other", "path": "other"},
			},
			wantEntriesLen: 2,
			wantFirstFetch: intPtr(0),
		},
		{
			name:    "invalid type returns error",
			input:   42,
			wantErr: true,
		},
		{
			name: "array with non-object element returns error",
			input: []any{
				"not-an-object",
			},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			disabled, entries, err := parseCheckoutConfig(tt.input)

			if tt.wantErr {
				assert.Error(t, err, "expected an error")
				return
			}
			require.NoError(t, err, "unexpected error")
			assert.Equal(t, tt.wantDisabled, disabled, "disabled flag mismatch")
			assert.Len(t, entries, tt.wantEntriesLen, "unexpected number of entries")

			if tt.wantEntriesLen > 0 && len(entries) > 0 {
				first := entries[0]
				assert.Equal(t, tt.wantFirstRepo, first.Repository, "repository mismatch")
				assert.Equal(t, tt.wantFirstPath, first.Path, "path mismatch")
				if tt.wantFirstFetch == nil {
					assert.Nil(t, first.FetchDepth, "fetch-depth should be nil")
				} else {
					require.NotNil(t, first.FetchDepth, "fetch-depth should not be nil")
					assert.Equal(t, *tt.wantFirstFetch, *first.FetchDepth, "fetch-depth value mismatch")
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// CheckoutManager – NewCheckoutManager
// ---------------------------------------------------------------------------

func TestNewCheckoutManager_Disabled(t *testing.T) {
	m := NewCheckoutManager(true, nil)
	assert.Empty(t, m.Entries(), "disabled manager should have no entries")
}

func TestNewCheckoutManager_DefaultEntry(t *testing.T) {
	m := NewCheckoutManager(false, nil)
	entries := m.Entries()
	require.Len(t, entries, 1, "should have exactly one default entry")
	assert.Empty(t, entries[0].Repository, "default repository should be empty (current repo)")
	assert.Empty(t, entries[0].Path, "default path should be empty (workspace root)")
	assert.Nil(t, entries[0].FetchDepth, "default fetch-depth should be nil")
}

func TestNewCheckoutManager_UserEntries(t *testing.T) {
	entries := []*CheckoutConfig{
		{Repository: "", FetchDepth: intPtr(0)},
		{Repository: "owner/other", Path: "other"},
	}
	m := NewCheckoutManager(false, entries)
	assert.Len(t, m.Entries(), 2, "should keep both user entries")
}

// ---------------------------------------------------------------------------
// CheckoutManager – deduplication / merge
// ---------------------------------------------------------------------------

func TestCheckoutManager_DeduplicatesSameKey(t *testing.T) {
	// Two entries for the same (repository="", path="") should be merged.
	entries := []*CheckoutConfig{
		{Repository: "", Path: "", FetchDepth: intPtr(1)},
		{Repository: "", Path: "", FetchDepth: intPtr(0)},
	}
	m := NewCheckoutManager(false, entries)
	got := m.Entries()
	require.Len(t, got, 1, "duplicate entries should be merged into one")
	require.NotNil(t, got[0].FetchDepth, "merged fetch-depth should not be nil")
	assert.Equal(t, 0, *got[0].FetchDepth, "deeper (0) fetch-depth should win")
}

func TestCheckoutManager_DeeperFetchDepthWins(t *testing.T) {
	// 0 (unlimited) should always win.
	tests := []struct {
		name      string
		first     *int
		second    *int
		wantDepth *int
	}{
		{"nil then 0", nil, intPtr(0), intPtr(0)},
		{"1 then 0", intPtr(1), intPtr(0), intPtr(0)},
		{"0 then 5", intPtr(0), intPtr(5), intPtr(0)},
		{"1 then 5", intPtr(1), intPtr(5), intPtr(5)},
		{"5 then 1", intPtr(5), intPtr(1), intPtr(5)},
		{"nil then nil", nil, nil, nil},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			entries := []*CheckoutConfig{
				{FetchDepth: tt.first},
				{FetchDepth: tt.second},
			}
			m := NewCheckoutManager(false, entries)
			got := m.Entries()
			require.Len(t, got, 1, "should be merged to single entry")
			if tt.wantDepth == nil {
				assert.Nil(t, got[0].FetchDepth, "merged fetch-depth should be nil")
			} else {
				require.NotNil(t, got[0].FetchDepth, "merged fetch-depth should not be nil")
				assert.Equal(t, *tt.wantDepth, *got[0].FetchDepth, "fetch-depth should match expected")
			}
		})
	}
}

func TestCheckoutManager_DifferentPathsAreDistinct(t *testing.T) {
	entries := []*CheckoutConfig{
		{Repository: "owner/repo", Path: ""},
		{Repository: "owner/repo", Path: "subdir"},
	}
	m := NewCheckoutManager(false, entries)
	assert.Len(t, m.Entries(), 2, "entries with different paths should not be merged")
}

// ---------------------------------------------------------------------------
// CheckoutManager – GenerateCheckoutSteps YAML output
// ---------------------------------------------------------------------------

func TestGenerateCheckoutSteps_DefaultCheckout(t *testing.T) {
	m := NewCheckoutManager(false, nil)
	compiler := NewCompiler()
	data := &WorkflowData{
		Tools: map[string]any{},
	}

	var sb strings.Builder
	m.GenerateCheckoutSteps(&sb, compiler, data)

	yaml := sb.String()
	assert.Contains(t, yaml, "name: Checkout repository", "should have default step name")
	assert.Contains(t, yaml, "actions/checkout", "should use actions/checkout")
	assert.Contains(t, yaml, "persist-credentials: false", "should disable credential persistence")
	assert.NotContains(t, yaml, "repository:", "default checkout should not specify repository")
	assert.NotContains(t, yaml, "path:", "default checkout should not specify path")
	assert.NotContains(t, yaml, "fetch-depth:", "default checkout should not specify fetch-depth when nil")
}

func TestGenerateCheckoutSteps_DisabledProducesNoOutput(t *testing.T) {
	m := NewCheckoutManager(true, nil)
	compiler := NewCompiler()
	data := &WorkflowData{Tools: map[string]any{}}

	var sb strings.Builder
	m.GenerateCheckoutSteps(&sb, compiler, data)

	assert.Empty(t, sb.String(), "disabled manager should produce no YAML output")
}

func TestGenerateCheckoutSteps_FetchDepth(t *testing.T) {
	m := NewCheckoutManager(false, []*CheckoutConfig{
		{FetchDepth: intPtr(0)},
	})
	compiler := NewCompiler()
	data := &WorkflowData{Tools: map[string]any{}}

	var sb strings.Builder
	m.GenerateCheckoutSteps(&sb, compiler, data)

	yaml := sb.String()
	assert.Contains(t, yaml, "fetch-depth: 0", "should emit fetch-depth: 0")
}

func TestGenerateCheckoutSteps_MultipleCheckouts(t *testing.T) {
	m := NewCheckoutManager(false, []*CheckoutConfig{
		{FetchDepth: intPtr(0)},
		{Repository: "owner/other", Path: "other", Token: "${{ secrets.PAT }}"},
	})
	compiler := NewCompiler()
	data := &WorkflowData{Tools: map[string]any{}}

	var sb strings.Builder
	m.GenerateCheckoutSteps(&sb, compiler, data)

	yaml := sb.String()
	assert.Contains(t, yaml, "fetch-depth: 0", "first entry should have fetch-depth 0")
	assert.Contains(t, yaml, "repository: owner/other", "second entry should have repository")
	assert.Contains(t, yaml, "path: other", "second entry should have path")
	assert.Contains(t, yaml, "token: ${{ secrets.PAT }}", "second entry should have token")
	// Both entries must have persist-credentials: false
	assert.Equal(t, 2, strings.Count(yaml, "persist-credentials: false"), "every checkout must have persist-credentials: false")
}

func TestGenerateCheckoutSteps_SparseCheckout(t *testing.T) {
	m := NewCheckoutManager(false, []*CheckoutConfig{
		{SparseCheckout: ".github/\nsrc/"},
	})
	compiler := NewCompiler()
	data := &WorkflowData{Tools: map[string]any{}}

	var sb strings.Builder
	m.GenerateCheckoutSteps(&sb, compiler, data)

	yaml := sb.String()
	assert.Contains(t, yaml, "sparse-checkout: |", "should emit sparse-checkout block")
	assert.Contains(t, yaml, ".github/", "should include first sparse path")
	assert.Contains(t, yaml, "src/", "should include second sparse path")
}

func TestGenerateCheckoutSteps_AdditionalCheckoutName(t *testing.T) {
	m := NewCheckoutManager(false, []*CheckoutConfig{
		{},
		{Repository: "owner/lib"},
	})
	compiler := NewCompiler()
	data := &WorkflowData{Tools: map[string]any{}}

	var sb strings.Builder
	m.GenerateCheckoutSteps(&sb, compiler, data)

	yaml := sb.String()
	assert.Contains(t, yaml, "name: Checkout owner/lib", "named checkout should use repository in step name")
}

// ---------------------------------------------------------------------------
// ParseFrontmatterConfig – checkout field integration
// ---------------------------------------------------------------------------

func TestParseFrontmatterConfig_CheckoutFalse(t *testing.T) {
	fm := map[string]any{
		"on":       map[string]any{"workflow_dispatch": nil},
		"checkout": false,
	}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.True(t, cfg.CheckoutDisabled, "checkout: false should disable checkout")
	assert.Nil(t, cfg.CheckoutEntries, "checkout: false should produce no entries")
}

func TestParseFrontmatterConfig_CheckoutObject(t *testing.T) {
	fm := map[string]any{
		"on": map[string]any{"workflow_dispatch": nil},
		"checkout": map[string]any{
			"fetch-depth": float64(0),
		},
	}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.False(t, cfg.CheckoutDisabled, "checkout object should not disable checkout")
	require.Len(t, cfg.CheckoutEntries, 1, "should have one entry")
	require.NotNil(t, cfg.CheckoutEntries[0].FetchDepth)
	assert.Equal(t, 0, *cfg.CheckoutEntries[0].FetchDepth, "fetch-depth should be 0")
}

func TestParseFrontmatterConfig_CheckoutArray(t *testing.T) {
	fm := map[string]any{
		"on": map[string]any{"workflow_dispatch": nil},
		"checkout": []any{
			map[string]any{"fetch-depth": float64(0)},
			map[string]any{"repository": "owner/other", "path": "other"},
		},
	}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.False(t, cfg.CheckoutDisabled)
	require.Len(t, cfg.CheckoutEntries, 2, "should have two entries")
	assert.Equal(t, "owner/other", cfg.CheckoutEntries[1].Repository)
	assert.Equal(t, "other", cfg.CheckoutEntries[1].Path)
}

func TestParseFrontmatterConfig_NoCheckout(t *testing.T) {
	fm := map[string]any{
		"on": map[string]any{"workflow_dispatch": nil},
	}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.False(t, cfg.CheckoutDisabled, "default should not disable checkout")
	assert.Nil(t, cfg.CheckoutEntries, "default should have nil entries")
}

// ---------------------------------------------------------------------------
// shouldAddCheckoutStep – checkout: false
// ---------------------------------------------------------------------------

func TestShouldAddCheckoutStep_CheckoutDisabled(t *testing.T) {
	compiler := NewCompiler()
	data := &WorkflowData{
		CheckoutDisabled: true,
	}
	assert.False(t, compiler.shouldAddCheckoutStep(data), "checkout: false should make shouldAddCheckoutStep return false")
}
