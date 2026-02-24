//go:build !integration

package workflow

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// ---------------------------------------------------------------------------
// parseCheckoutConfig
// ---------------------------------------------------------------------------

func TestParseCheckoutConfig(t *testing.T) {
	t.Run("false disables checkout", func(t *testing.T) {
		disabled, entries, err := parseCheckoutConfig(false)
		require.NoError(t, err)
		assert.True(t, disabled, "disabled should be true")
		assert.Empty(t, entries)
	})

	t.Run("true is treated as not-disabled (no-op)", func(t *testing.T) {
		disabled, entries, err := parseCheckoutConfig(true)
		require.NoError(t, err)
		assert.False(t, disabled, "true should mean not-disabled")
		assert.Empty(t, entries)
	})

	t.Run("empty object produces one default entry", func(t *testing.T) {
		disabled, entries, err := parseCheckoutConfig(map[string]any{})
		require.NoError(t, err)
		assert.False(t, disabled)
		require.Len(t, entries, 1)
		assert.Empty(t, entries[0].Repository)
		assert.Empty(t, entries[0].CheckoutDir)
	})

	t.Run("object with repository and checkout-dir", func(t *testing.T) {
		disabled, entries, err := parseCheckoutConfig(map[string]any{
			"repository":   "owner/repo",
			"checkout-dir": "my-dir",
		})
		require.NoError(t, err)
		assert.False(t, disabled)
		require.Len(t, entries, 1)
		assert.Equal(t, "owner/repo", entries[0].Repository)
		assert.Equal(t, "my-dir", entries[0].CheckoutDir)
	})

	t.Run("object with fetch-depth zero", func(t *testing.T) {
		depth := 0
		disabled, entries, err := parseCheckoutConfig(map[string]any{
			"fetch-depth": depth,
		})
		require.NoError(t, err)
		assert.False(t, disabled)
		require.Len(t, entries, 1)
		require.NotNil(t, entries[0].FetchDepth)
		assert.Equal(t, 0, *entries[0].FetchDepth)
	})

	t.Run("array of two objects", func(t *testing.T) {
		disabled, entries, err := parseCheckoutConfig([]any{
			map[string]any{"fetch-depth": 0},
			map[string]any{"repository": "owner/lib", "checkout-dir": "lib"},
		})
		require.NoError(t, err)
		assert.False(t, disabled)
		require.Len(t, entries, 2)
		assert.Equal(t, 0, *entries[0].FetchDepth)
		assert.Equal(t, "owner/lib", entries[1].Repository)
		assert.Equal(t, "lib", entries[1].CheckoutDir)
	})

	t.Run("array with non-object item returns error", func(t *testing.T) {
		_, _, err := parseCheckoutConfig([]any{"not-an-object"})
		assert.Error(t, err)
	})

	t.Run("unexpected type returns error", func(t *testing.T) {
		_, _, err := parseCheckoutConfig(42)
		assert.Error(t, err)
	})

	t.Run("github-token is preserved", func(t *testing.T) {
		disabled, entries, err := parseCheckoutConfig(map[string]any{
			"github-token": "${{ secrets.MY_PAT }}",
		})
		require.NoError(t, err)
		assert.False(t, disabled)
		require.Len(t, entries, 1)
		assert.Equal(t, "${{ secrets.MY_PAT }}", entries[0].GitHubToken)
	})
}

// ---------------------------------------------------------------------------
// CheckoutManager – NewCheckoutManager
// ---------------------------------------------------------------------------

func TestNewCheckoutManager_Disabled(t *testing.T) {
	m := NewCheckoutManager(true, nil)
	assert.False(t, m.HasCheckout(), "disabled manager should have no entries")
	assert.Empty(t, m.Entries())
}

func TestNewCheckoutManager_DefaultSingleEntry(t *testing.T) {
	m := NewCheckoutManager(false, nil)
	require.True(t, m.HasCheckout())
	entries := m.Entries()
	require.Len(t, entries, 1)
	assert.Empty(t, entries[0].Repository, "default entry is current repo")
	assert.Empty(t, entries[0].CheckoutDir, "default entry is workspace root")
}

func TestNewCheckoutManager_UserEntries(t *testing.T) {
	entries := []*CheckoutConfig{
		{Repository: "owner/a"},
		{Repository: "owner/b", CheckoutDir: "b"},
	}
	m := NewCheckoutManager(false, entries)
	require.Len(t, m.Entries(), 2)
	assert.Equal(t, "owner/a", m.Entries()[0].Repository)
	assert.Equal(t, "owner/b", m.Entries()[1].Repository)
}

// ---------------------------------------------------------------------------
// CheckoutManager – deduplication and fetch-depth merging
// ---------------------------------------------------------------------------

func TestCheckoutManager_DeduplicateSameKey(t *testing.T) {
	depth1 := 1
	entries := []*CheckoutConfig{
		{Repository: "owner/repo", FetchDepth: &depth1},
		{Repository: "owner/repo"}, // nil depth = default 1
	}
	m := NewCheckoutManager(false, entries)
	// Two entries share the same key (same repo, same empty checkout-dir)
	assert.Len(t, m.Entries(), 1, "duplicate keys should be merged into one entry")
}

func TestCheckoutManager_FetchDepthMerge_FullHistoryWins(t *testing.T) {
	depth50 := 50
	depth0 := 0
	entries := []*CheckoutConfig{
		{FetchDepth: &depth50},
		{FetchDepth: &depth0}, // full history beats 50
	}
	m := NewCheckoutManager(false, entries)
	require.Len(t, m.Entries(), 1)
	require.NotNil(t, m.Entries()[0].FetchDepth)
	assert.Equal(t, 0, *m.Entries()[0].FetchDepth, "fetch-depth 0 (full history) should win")
}

func TestCheckoutManager_FetchDepthMerge_DeeperPositiveWins(t *testing.T) {
	depth10 := 10
	depth50 := 50
	entries := []*CheckoutConfig{
		{FetchDepth: &depth10},
		{FetchDepth: &depth50}, // deeper value wins
	}
	m := NewCheckoutManager(false, entries)
	require.Len(t, m.Entries(), 1)
	require.NotNil(t, m.Entries()[0].FetchDepth)
	assert.Equal(t, 50, *m.Entries()[0].FetchDepth)
}

func TestCheckoutManager_FetchDepthMerge_FullHistoryFirstEntryWins(t *testing.T) {
	depth0 := 0
	depth10 := 10
	entries := []*CheckoutConfig{
		{FetchDepth: &depth0}, // full history first
		{FetchDepth: &depth10},
	}
	m := NewCheckoutManager(false, entries)
	require.Len(t, m.Entries(), 1)
	require.NotNil(t, m.Entries()[0].FetchDepth)
	assert.Equal(t, 0, *m.Entries()[0].FetchDepth, "existing full-history should not be downgraded")
}

func TestCheckoutManager_DifferentPathsNotMerged(t *testing.T) {
	entries := []*CheckoutConfig{
		{Repository: "owner/repo", CheckoutDir: "dir-a"},
		{Repository: "owner/repo", CheckoutDir: "dir-b"},
	}
	m := NewCheckoutManager(false, entries)
	assert.Len(t, m.Entries(), 2, "different checkout-dirs should NOT be merged")
}

func TestCheckoutManager_DifferentReposNotMerged(t *testing.T) {
	entries := []*CheckoutConfig{
		{Repository: "owner/repo-a"},
		{Repository: "owner/repo-b"},
	}
	m := NewCheckoutManager(false, entries)
	assert.Len(t, m.Entries(), 2, "different repositories should NOT be merged")
}

// ---------------------------------------------------------------------------
// ParseFrontmatterConfig – checkout field integration
// ---------------------------------------------------------------------------

func TestParseFrontmatterConfig_CheckoutFalse(t *testing.T) {
	fm := map[string]any{
		"checkout": false,
	}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.True(t, cfg.CheckoutDisabled)
	assert.Empty(t, cfg.CheckoutEntries)
}

func TestParseFrontmatterConfig_CheckoutObject(t *testing.T) {
	fm := map[string]any{
		"checkout": map[string]any{
			"fetch-depth": 0,
		},
	}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.False(t, cfg.CheckoutDisabled)
	require.Len(t, cfg.CheckoutEntries, 1)
	require.NotNil(t, cfg.CheckoutEntries[0].FetchDepth)
	assert.Equal(t, 0, *cfg.CheckoutEntries[0].FetchDepth)
}

func TestParseFrontmatterConfig_CheckoutArray(t *testing.T) {
	fm := map[string]any{
		"checkout": []any{
			map[string]any{"fetch-depth": 0},
			map[string]any{"repository": "owner/lib", "checkout-dir": "lib"},
		},
	}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.False(t, cfg.CheckoutDisabled)
	require.Len(t, cfg.CheckoutEntries, 2)
	assert.Equal(t, "owner/lib", cfg.CheckoutEntries[1].Repository)
}

func TestParseFrontmatterConfig_NoCheckout(t *testing.T) {
	fm := map[string]any{}
	cfg, err := ParseFrontmatterConfig(fm)
	require.NoError(t, err)
	assert.False(t, cfg.CheckoutDisabled)
	assert.Empty(t, cfg.CheckoutEntries)
}
