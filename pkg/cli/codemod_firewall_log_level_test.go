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
	assert.Equal(t, "0.9.0", codemod.IntroducedIn)
	require.NotNil(t, codemod.Apply)
}

func TestFirewallLogLevelCodemod_RemovesLogLevel(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  allowed:
    - github.com
  firewall:
    version: v1.0.0
    log-level: debug
    args:
      - --custom-arg
---

# Test Workflow`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"allowed": []any{"github.com"},
			"firewall": map[string]any{
				"version":   "v1.0.0",
				"log-level": "debug",
				"args":      []any{"--custom-arg"},
			},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.True(t, applied)
	assert.NotContains(t, result, "log-level:")
	assert.Contains(t, result, "version: v1.0.0")
	assert.Contains(t, result, "- --custom-arg")
}

func TestFirewallLogLevelCodemod_RemovesLogLevelUnderscore(t *testing.T) {
	codemod := getFirewallLogLevelRemovalCodemod()

	content := `---
on: workflow_dispatch
network:
  firewall:
    log_level: info
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": map[string]any{
				"log_level": "info",
			},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.True(t, applied)
	assert.NotContains(t, result, "log_level:")
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
    - github.com
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"allowed": []any{"github.com"},
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
    args:
      - --custom-arg
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"firewall": map[string]any{
				"version": "v1.0.0",
				"args":    []any{"--custom-arg"},
			},
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
  allowed:
    - github.com
    - api.github.com
  blocked:
    - bad.example.com
  firewall:
    version: v1.0.0
    log-level: warn
    ssl-bump: true
---

# Test`

	frontmatter := map[string]any{
		"on": "workflow_dispatch",
		"network": map[string]any{
			"allowed": []any{"github.com", "api.github.com"},
			"blocked": []any{"bad.example.com"},
			"firewall": map[string]any{
				"version":   "v1.0.0",
				"log-level": "warn",
				"ssl-bump":  true,
			},
		},
	}

	result, applied, err := codemod.Apply(content, frontmatter)

	require.NoError(t, err)
	assert.True(t, applied)
	assert.NotContains(t, result, "log-level:")
	assert.Contains(t, result, "version: v1.0.0")
	assert.Contains(t, result, "ssl-bump: true")
	assert.Contains(t, result, "- github.com")
	assert.Contains(t, result, "- bad.example.com")
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

This workflow uses network restrictions.`

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
	assert.Contains(t, result, "This workflow uses network restrictions.")
}
