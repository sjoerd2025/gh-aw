//go:build !integration

package cli

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetFirewallLogLevelRemovalCodemod(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	assert.Equal(t, "firewall-log-level-removal", codemod.ID)
	assert.Equal(t, "Remove deprecated network.firewall.log-level field", codemod.Name)
	assert.NotEmpty(t, codemod.Description)
	assert.Equal(t, "0.1.0", codemod.IntroducedIn)
	require.NotNil(t, codemod.Apply)
}

func TestFirewallLogLevelCodemod_RemovesLogLevel(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  firewall:
    version: v1.0.0
    log-level: debug
    ssl-bump: false
  allowed:
    - defaults
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": map[string]any{
				"version":   "v1.0.0",
				"log-level": "debug",
				"ssl-bump":  false,
			},
			"allowed": []any{"defaults"},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.True(t, applied)
	assert.NotContains(t, result, "log-level:")
	assert.Contains(t, result, "version: v1.0.0")
	assert.Contains(t, result, "ssl-bump: false")
	assert.Contains(t, result, "allowed:")
}

func TestFirewallLogLevelCodemod_RemovesLogLevelUnderscore(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  firewall:
    version: v1.0.0
    log_level: info
  allowed:
    - defaults
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": map[string]any{
				"version":   "v1.0.0",
				"log_level": "info",
			},
			"allowed": []any{"defaults"},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.True(t, applied)
	assert.NotContains(t, result, "log_level:")
	assert.Contains(t, result, "version: v1.0.0")
}

func TestFirewallLogLevelCodemod_NoNetworkField(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
permissions:
  contents: read
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"permissions": map[string]any{
			"contents": "read",
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.False(t, applied)
	assert.Equal(t, content, result)
}

func TestFirewallLogLevelCodemod_NoFirewallField(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  allowed:
    - defaults
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"allowed": []any{"defaults"},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.False(t, applied)
	assert.Equal(t, content, result)
}

func TestFirewallLogLevelCodemod_FirewallNotObject(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  firewall: true
  allowed:
    - defaults
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": true,
			"allowed":  []any{"defaults"},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.False(t, applied)
	assert.Equal(t, content, result)
}

func TestFirewallLogLevelCodemod_NoLogLevelField(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  firewall:
    version: v1.0.0
    ssl-bump: true
  allowed:
    - defaults
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": map[string]any{
				"version":  "v1.0.0",
				"ssl-bump": true,
			},
			"allowed": []any{"defaults"},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.False(t, applied)
	assert.Equal(t, content, result)
}

func TestFirewallLogLevelCodemod_PreservesOtherFields(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  firewall:
    version: v2.0.0
    log-level: warn
    ssl-bump: true
    allow-urls:
      - "https://github.com/githubnext/*"
    args:
      - --custom-flag
  allowed:
    - defaults
    - github
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": map[string]any{
				"version":    "v2.0.0",
				"log-level":  "warn",
				"ssl-bump":   true,
				"allow-urls": []any{"https://github.com/githubnext/*"},
				"args":       []any{"--custom-flag"},
			},
			"allowed": []any{"defaults", "github"},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.True(t, applied)
	assert.NotContains(t, result, "log-level:")
	assert.Contains(t, result, "version: v2.0.0")
	assert.Contains(t, result, "ssl-bump: true")
	assert.Contains(t, result, "allow-urls:")
	assert.Contains(t, result, "args:")
	assert.Contains(t, result, "allowed:")
}

func TestFirewallLogLevelCodemod_PreservesMarkdown(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  firewall:
    log-level: error
---

# Test Workflow

This workflow tests firewall log level removal.`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": map[string]any{
				"log-level": "error",
			},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.True(t, applied)
	assert.Contains(t, result, "# Test Workflow")
	assert.Contains(t, result, "This workflow tests firewall log level removal.")
}
