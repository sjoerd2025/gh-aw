//go:build !integration

package workflow

import (
	"strings"
	"testing"

	"github.com/github/gh-aw/pkg/constants"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestCopilotRequestsFeatureSkipsValidation verifies that the validate-secret step
// is not generated when the copilot-requests feature flag is enabled.
func TestCopilotRequestsFeatureSkipsValidation(t *testing.T) {
	engine := NewCopilotEngine()

	t.Run("validation step present without feature", func(t *testing.T) {
		workflowData := &WorkflowData{}
		steps := engine.GetInstallationSteps(workflowData)
		// Validate that the validate-secret step is present
		hasValidation := false
		for _, step := range steps {
			for _, line := range step {
				if strings.Contains(line, "id: validate-secret") {
					hasValidation = true
					break
				}
			}
		}
		assert.True(t, hasValidation, "Expected validate-secret step to be present when copilot-requests feature is disabled")
	})

	t.Run("validation step absent with feature enabled", func(t *testing.T) {
		workflowData := &WorkflowData{
			Features: map[string]any{
				string(constants.CopilotRequestsFeatureFlag): true,
			},
		}
		steps := engine.GetInstallationSteps(workflowData)
		// Validate that the validate-secret step is NOT present
		for _, step := range steps {
			for _, line := range step {
				assert.NotContains(t, line, "id: validate-secret",
					"Expected validate-secret step to be absent when copilot-requests feature is enabled")
			}
		}
	})
}

// TestCopilotRequestsFeatureUsesGitHubToken verifies that github.token is used
// instead of secrets.COPILOT_GITHUB_TOKEN when the copilot-requests feature is enabled.
func TestCopilotRequestsFeatureUsesGitHubToken(t *testing.T) {
	engine := NewCopilotEngine()

	t.Run("uses COPILOT_GITHUB_TOKEN secret without feature", func(t *testing.T) {
		workflowData := &WorkflowData{Name: "test-workflow"}
		steps := engine.GetExecutionSteps(workflowData, "/tmp/gh-aw/test.log")
		require.Len(t, steps, 1, "Expected 1 execution step")
		stepContent := strings.Join([]string(steps[0]), "\n")
		assert.Contains(t, stepContent, "COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}",
			"Expected COPILOT_GITHUB_TOKEN to use secrets expression without feature flag")
	})

	t.Run("uses github.token with feature enabled", func(t *testing.T) {
		workflowData := &WorkflowData{
			Name: "test-workflow",
			Features: map[string]any{
				string(constants.CopilotRequestsFeatureFlag): true,
			},
		}
		steps := engine.GetExecutionSteps(workflowData, "/tmp/gh-aw/test.log")
		require.Len(t, steps, 1, "Expected 1 execution step")
		stepContent := strings.Join([]string(steps[0]), "\n")
		assert.Contains(t, stepContent, "COPILOT_GITHUB_TOKEN: ${{ github.token }}",
			"Expected COPILOT_GITHUB_TOKEN to use github.token when copilot-requests feature is enabled")
		assert.NotContains(t, stepContent, "secrets.COPILOT_GITHUB_TOKEN",
			"Expected no reference to secrets.COPILOT_GITHUB_TOKEN when copilot-requests feature is enabled")
	})
}

// TestCopilotRequestsFeatureRequiredSecrets verifies that COPILOT_GITHUB_TOKEN is excluded
// from required secrets when the copilot-requests feature is enabled.
func TestCopilotRequestsFeatureRequiredSecrets(t *testing.T) {
	engine := NewCopilotEngine()

	t.Run("COPILOT_GITHUB_TOKEN required without feature", func(t *testing.T) {
		workflowData := &WorkflowData{}
		secrets := engine.GetRequiredSecretNames(workflowData)
		assert.Contains(t, secrets, "COPILOT_GITHUB_TOKEN",
			"Expected COPILOT_GITHUB_TOKEN in required secrets without feature flag")
	})

	t.Run("COPILOT_GITHUB_TOKEN not required with feature enabled", func(t *testing.T) {
		workflowData := &WorkflowData{
			Features: map[string]any{
				string(constants.CopilotRequestsFeatureFlag): true,
			},
		}
		secrets := engine.GetRequiredSecretNames(workflowData)
		assert.NotContains(t, secrets, "COPILOT_GITHUB_TOKEN",
			"Expected COPILOT_GITHUB_TOKEN to be absent from required secrets when copilot-requests feature is enabled")
	})
}

// TestCopilotRequestsFeatureAddsPermission verifies that the copilot-requests:write
// permission is added to the agent job when the feature is enabled.
func TestCopilotRequestsFeatureAddsPermission(t *testing.T) {
	t.Run("no copilot-requests permission without feature", func(t *testing.T) {
		compiler := NewCompiler()
		workflowData := &WorkflowData{
			Name: "test-workflow",
			AI:   "copilot",
		}
		job, err := compiler.buildMainJob(workflowData, false)
		require.NoError(t, err, "buildMainJob should succeed")
		assert.NotContains(t, job.Permissions, "copilot-requests",
			"Expected no copilot-requests permission without feature flag")
	})

	t.Run("copilot-requests:write added with feature enabled", func(t *testing.T) {
		compiler := NewCompiler()
		workflowData := &WorkflowData{
			Name: "test-workflow",
			AI:   "copilot",
			Features: map[string]any{
				string(constants.CopilotRequestsFeatureFlag): true,
			},
		}
		job, err := compiler.buildMainJob(workflowData, false)
		require.NoError(t, err, "buildMainJob should succeed")
		assert.Contains(t, job.Permissions, "copilot-requests: write",
			"Expected copilot-requests: write permission when copilot-requests feature is enabled")
	})

	t.Run("copilot-requests:write added when user provides permissions", func(t *testing.T) {
		compiler := NewCompiler()
		workflowData := &WorkflowData{
			Name:        "test-workflow",
			AI:          "copilot",
			Permissions: "permissions:\n  contents: read\n  issues: write",
			Features: map[string]any{
				string(constants.CopilotRequestsFeatureFlag): true,
			},
		}
		job, err := compiler.buildMainJob(workflowData, false)
		require.NoError(t, err, "buildMainJob should succeed with user-provided permissions")
		assert.Contains(t, job.Permissions, "copilot-requests: write",
			"Expected copilot-requests: write permission to be added to existing permissions")
		assert.Contains(t, job.Permissions, "contents: read",
			"Expected existing contents: read permission to be preserved")
		assert.Contains(t, job.Permissions, "issues: write",
			"Expected existing issues: write permission to be preserved")
	})
}
