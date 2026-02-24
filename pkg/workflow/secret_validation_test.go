//go:build !integration

package workflow

import (
	"fmt"
	"strings"
	"testing"
)

func TestGenerateSecretValidationStep(t *testing.T) {
	tests := []struct {
		name        string
		secretName  string
		engineName  string
		docsURL     string
		wantStrings []string
	}{
		{
			name:       "ANTHROPIC_API_KEY validation",
			secretName: "ANTHROPIC_API_KEY",
			engineName: "Claude Code",
			docsURL:    "https://github.github.com/gh-aw/reference/engines/#anthropic-claude-code",
			wantStrings: []string{
				"Validate ANTHROPIC_API_KEY secret",
				"Error: ANTHROPIC_API_KEY secret is not set",
				"The Claude Code engine requires the ANTHROPIC_API_KEY secret to be configured",
				"Please configure this secret in your repository settings",
				"Documentation: https://github.github.com/gh-aw/reference/engines/#anthropic-claude-code",
				"<details>",
				"<summary>Agent Environment Validation</summary>",
				"✅ ANTHROPIC_API_KEY: Configured",
				"</details>",
				"ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			step := GenerateSecretValidationStep(tt.secretName, tt.engineName, tt.docsURL)
			stepContent := strings.Join(step, "\n")

			for _, want := range tt.wantStrings {
				if !strings.Contains(stepContent, want) {
					t.Errorf("GenerateSecretValidationStep() missing expected string:\nwant: %s\ngot: %s", want, stepContent)
				}
			}

			// Verify it has a run block
			if !strings.Contains(stepContent, "run: |") {
				t.Error("Expected step to have 'run: |' block")
			}

			// Verify it has an env section
			if !strings.Contains(stepContent, "env:") {
				t.Error("Expected step to have 'env:' section")
			}

			// Verify it exits with code 1 on failure
			if !strings.Contains(stepContent, "exit 1") {
				t.Error("Expected step to exit with code 1 on validation failure")
			}
		})
	}
}

func TestGenerateMultiSecretValidationStep(t *testing.T) {
	tests := []struct {
		name        string
		secretNames []string
		engineName  string
		docsURL     string
		wantStrings []string
	}{
		{
			name:        "Codex dual secret validation",
			secretNames: []string{"CODEX_API_KEY", "OPENAI_API_KEY"},
			engineName:  "Codex",
			docsURL:     "https://github.github.com/gh-aw/reference/engines/#openai-codex",
			wantStrings: []string{
				"Validate CODEX_API_KEY or OPENAI_API_KEY secret",
				"run: /opt/gh-aw/actions/validate_multi_secret.sh CODEX_API_KEY OPENAI_API_KEY Codex https://github.github.com/gh-aw/reference/engines/#openai-codex",
				"CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}",
				"OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}",
			},
		},
		{
			name:        "GitHub Copilot CLI with multi-word engine name",
			secretNames: []string{"COPILOT_GITHUB_TOKEN"},
			engineName:  "GitHub Copilot CLI",
			docsURL:     "https://github.github.com/gh-aw/reference/engines/#github-copilot-default",
			wantStrings: []string{
				"Validate COPILOT_GITHUB_TOKEN secret",
				"run: /opt/gh-aw/actions/validate_multi_secret.sh COPILOT_GITHUB_TOKEN 'GitHub Copilot CLI' https://github.github.com/gh-aw/reference/engines/#github-copilot-default",
				"COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}",
			},
		},
		{
			name:        "Claude Code with single secret",
			secretNames: []string{"ANTHROPIC_API_KEY"},
			engineName:  "Claude Code",
			docsURL:     "https://github.github.com/gh-aw/reference/engines/#anthropic-claude-code",
			wantStrings: []string{
				"Validate ANTHROPIC_API_KEY secret",
				"run: /opt/gh-aw/actions/validate_multi_secret.sh ANTHROPIC_API_KEY 'Claude Code' https://github.github.com/gh-aw/reference/engines/#anthropic-claude-code",
				"ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			step := GenerateMultiSecretValidationStep(tt.secretNames, tt.engineName, tt.docsURL)
			stepContent := strings.Join(step, "\n")

			for _, want := range tt.wantStrings {
				if !strings.Contains(stepContent, want) {
					t.Errorf("GenerateMultiSecretValidationStep() missing expected string:\nwant: %s\ngot: %s", want, stepContent)
				}
			}

			// Verify it calls the validate_multi_secret.sh script
			if !strings.Contains(stepContent, "/opt/gh-aw/actions/validate_multi_secret.sh") {
				t.Error("Expected step to call validate_multi_secret.sh script")
			}

			// Verify it has an env section
			if !strings.Contains(stepContent, "env:") {
				t.Error("Expected step to have 'env:' section")
			}

			// Verify all secrets are passed as environment variables
			for _, secretName := range tt.secretNames {
				expectedEnvVar := fmt.Sprintf("%s: ${{ secrets.%s }}", secretName, secretName)
				if !strings.Contains(stepContent, expectedEnvVar) {
					t.Errorf("Expected step to have environment variable: %s", expectedEnvVar)
				}
			}

			// Verify step has id field
			if !strings.Contains(stepContent, "id: validate-secret") {
				t.Error("Expected step to have 'id: validate-secret' field")
			}
		})
	}
}

// TestGenerateMultiSecretValidationStepWithEnvOverrides verifies that engine.env overrides
// are reflected in the validation step env section.
func TestGenerateMultiSecretValidationStepWithEnvOverrides(t *testing.T) {
	tests := []struct {
		name         string
		secretNames  []string
		engineName   string
		docsURL      string
		envOverrides map[string]string
		wantExpr     string
		notWantExpr  string
	}{
		{
			name:        "copilot token overridden via engine.env",
			secretNames: []string{"COPILOT_GITHUB_TOKEN"},
			engineName:  "GitHub Copilot CLI",
			docsURL:     "https://example.com",
			envOverrides: map[string]string{
				"COPILOT_GITHUB_TOKEN": "${{ secrets.MY_SECRET }}",
			},
			wantExpr:    "COPILOT_GITHUB_TOKEN: ${{ secrets.MY_SECRET }}",
			notWantExpr: "COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}",
		},
		{
			name:        "anthropic key overridden via engine.env",
			secretNames: []string{"ANTHROPIC_API_KEY"},
			engineName:  "Claude Code",
			docsURL:     "https://example.com",
			envOverrides: map[string]string{
				"ANTHROPIC_API_KEY": "${{ secrets.ORG_ANTHROPIC_KEY }}",
			},
			wantExpr:    "ANTHROPIC_API_KEY: ${{ secrets.ORG_ANTHROPIC_KEY }}",
			notWantExpr: "ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}",
		},
		{
			name:        "override one of two secrets",
			secretNames: []string{"CODEX_API_KEY", "OPENAI_API_KEY"},
			engineName:  "Codex",
			docsURL:     "https://example.com",
			envOverrides: map[string]string{
				"CODEX_API_KEY": "${{ secrets.MY_CODEX_KEY }}",
			},
			wantExpr:    "CODEX_API_KEY: ${{ secrets.MY_CODEX_KEY }}",
			notWantExpr: "CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}",
		},
		{
			name:        "irrelevant override does not change secret expressions",
			secretNames: []string{"COPILOT_GITHUB_TOKEN"},
			engineName:  "GitHub Copilot CLI",
			docsURL:     "https://example.com",
			envOverrides: map[string]string{
				"OTHER_VAR": "some-value",
			},
			wantExpr:    "COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}",
			notWantExpr: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			step := GenerateMultiSecretValidationStep(tt.secretNames, tt.engineName, tt.docsURL, tt.envOverrides)
			stepContent := strings.Join(step, "\n")

			if !strings.Contains(stepContent, tt.wantExpr) {
				t.Errorf("GenerateMultiSecretValidationStep() with overrides: missing expected expression:\nwant: %s\ngot:\n%s", tt.wantExpr, stepContent)
			}
			if tt.notWantExpr != "" && strings.Contains(stepContent, tt.notWantExpr) {
				t.Errorf("GenerateMultiSecretValidationStep() with overrides: found unexpected expression:\nunwanted: %s\ngot:\n%s", tt.notWantExpr, stepContent)
			}

			// The step command must still reference the original secret NAME (not the override expr)
			if !strings.Contains(stepContent, "validate_multi_secret.sh") {
				t.Error("Expected step to call validate_multi_secret.sh")
			}
		})
	}
}

func TestClaudeEngineHasSecretValidation(t *testing.T) {
	engine := NewClaudeEngine()
	workflowData := &WorkflowData{}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	// First step should be secret validation (only ANTHROPIC_API_KEY)
	firstStep := strings.Join(steps[0], "\n")
	if !strings.Contains(firstStep, "Validate ANTHROPIC_API_KEY secret") {
		t.Error("First installation step should validate ANTHROPIC_API_KEY secret")
	}
	if !strings.Contains(firstStep, "ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}") {
		t.Error("Secret validation step should reference secrets.ANTHROPIC_API_KEY")
	}
}

func TestCopilotEngineHasSecretValidation(t *testing.T) {
	engine := NewCopilotEngine()
	workflowData := &WorkflowData{}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	// First step should be secret validation
	firstStep := strings.Join(steps[0], "\n")
	if !strings.Contains(firstStep, "Validate COPILOT_GITHUB_TOKEN secret") {
		t.Error("First installation step should validate COPILOT_GITHUB_TOKEN secret")
	}
	if !strings.Contains(firstStep, "COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}") {
		t.Error("Secret validation step should reference secrets.COPILOT_GITHUB_TOKEN")
	}
}

func TestCodexEngineHasSecretValidation(t *testing.T) {
	engine := NewCodexEngine()
	workflowData := &WorkflowData{}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	// First step should be secret validation
	firstStep := strings.Join(steps[0], "\n")
	if !strings.Contains(firstStep, "Validate CODEX_API_KEY or OPENAI_API_KEY secret") {
		t.Error("First installation step should validate CODEX_API_KEY or OPENAI_API_KEY secret")
	}

	// Should check for both secrets
	if !strings.Contains(firstStep, "CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}") {
		t.Error("Secret validation step should reference secrets.CODEX_API_KEY")
	}
	if !strings.Contains(firstStep, "OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}") {
		t.Error("Secret validation step should reference secrets.OPENAI_API_KEY")
	}

	// Should call the validate_multi_secret.sh script with both secret names
	if !strings.Contains(firstStep, "/opt/gh-aw/actions/validate_multi_secret.sh") {
		t.Error("Should call validate_multi_secret.sh script")
	}
	if !strings.Contains(firstStep, "CODEX_API_KEY OPENAI_API_KEY") {
		t.Error("Should pass both CODEX_API_KEY and OPENAI_API_KEY to the script")
	}
}

// TestCopilotEngineValidationStepHonoursEnvOverride verifies that when the user provides
// engine.env.COPILOT_GITHUB_TOKEN with a custom secret expression, the validation step
// exposes the token via that expression rather than the default ${{ secrets.COPILOT_GITHUB_TOKEN }}.
func TestCopilotEngineValidationStepHonoursEnvOverride(t *testing.T) {
	engine := NewCopilotEngine()
	workflowData := &WorkflowData{
		EngineConfig: &EngineConfig{
			ID: "copilot",
			Env: map[string]string{
				"COPILOT_GITHUB_TOKEN": "${{ secrets.MY_SECRET }}",
			},
		},
	}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	firstStep := strings.Join(steps[0], "\n")

	// Must use the override expression
	if !strings.Contains(firstStep, "COPILOT_GITHUB_TOKEN: ${{ secrets.MY_SECRET }}") {
		t.Error("Validation step should reference the overridden secret expression secrets.MY_SECRET")
	}
	// Must NOT use the default expression
	if strings.Contains(firstStep, "COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}") {
		t.Error("Validation step should not reference the default secrets.COPILOT_GITHUB_TOKEN when overridden")
	}
}

// TestClaudeEngineValidationStepHonoursEnvOverride verifies that Claude's validation step
// uses a custom ANTHROPIC_API_KEY expression when provided via engine.env.
func TestClaudeEngineValidationStepHonoursEnvOverride(t *testing.T) {
	engine := NewClaudeEngine()
	workflowData := &WorkflowData{
		EngineConfig: &EngineConfig{
			ID: "claude",
			Env: map[string]string{
				"ANTHROPIC_API_KEY": "${{ secrets.ORG_ANTHROPIC_KEY }}",
			},
		},
	}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	firstStep := strings.Join(steps[0], "\n")

	if !strings.Contains(firstStep, "ANTHROPIC_API_KEY: ${{ secrets.ORG_ANTHROPIC_KEY }}") {
		t.Error("Validation step should reference the overridden secret expression")
	}
	if strings.Contains(firstStep, "ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}") {
		t.Error("Validation step should not reference the default secret when overridden")
	}
}

// TestCodexEngineValidationStepHonoursEnvOverride verifies that Codex's validation step
// uses a custom secret expression when provided via engine.env.
func TestCodexEngineValidationStepHonoursEnvOverride(t *testing.T) {
	engine := NewCodexEngine()
	workflowData := &WorkflowData{
		EngineConfig: &EngineConfig{
			ID: "codex",
			Env: map[string]string{
				"CODEX_API_KEY": "${{ secrets.MY_CODEX_KEY }}",
			},
		},
	}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	firstStep := strings.Join(steps[0], "\n")

	if !strings.Contains(firstStep, "CODEX_API_KEY: ${{ secrets.MY_CODEX_KEY }}") {
		t.Error("Validation step should reference the overridden CODEX_API_KEY expression")
	}
	if strings.Contains(firstStep, "CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}") {
		t.Error("Validation step should not reference the default CODEX_API_KEY when overridden")
	}
	// Non-overridden secret should still use default expression
	if !strings.Contains(firstStep, "OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}") {
		t.Error("Non-overridden OPENAI_API_KEY should still reference secrets.OPENAI_API_KEY")
	}
}
