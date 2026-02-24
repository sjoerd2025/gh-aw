//go:build !integration

package workflow

import (
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
		name              string
		secretNames       []string
		secretExpressions map[string]string
		engineName        string
		docsURL           string
		wantStrings       []string
		wantAbsentStrings []string
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
		{
			name:        "Copilot with overridden token expression",
			secretNames: []string{"COPILOT_GITHUB_TOKEN"},
			secretExpressions: map[string]string{
				"COPILOT_GITHUB_TOKEN": "${{ secrets.MY_SECRET }}",
			},
			engineName: "GitHub Copilot CLI",
			docsURL:    "https://github.github.com/gh-aw/reference/engines/#github-copilot-default",
			wantStrings: []string{
				"Validate COPILOT_GITHUB_TOKEN secret",
				// Script args still reference the env var name, not the secret name
				"run: /opt/gh-aw/actions/validate_multi_secret.sh COPILOT_GITHUB_TOKEN 'GitHub Copilot CLI'",
				// Env section uses the overridden secret expression
				"COPILOT_GITHUB_TOKEN: ${{ secrets.MY_SECRET }}",
			},
			wantAbsentStrings: []string{
				// Default expression must NOT appear when an override is provided
				"COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}",
			},
		},
		{
			name:        "Claude with overridden API key expression",
			secretNames: []string{"ANTHROPIC_API_KEY"},
			secretExpressions: map[string]string{
				"ANTHROPIC_API_KEY": "${{ secrets.ORG_ANTHROPIC_KEY }}",
			},
			engineName: "Claude Code",
			docsURL:    "https://github.github.com/gh-aw/reference/engines/#anthropic-claude-code",
			wantStrings: []string{
				"Validate ANTHROPIC_API_KEY secret",
				"ANTHROPIC_API_KEY: ${{ secrets.ORG_ANTHROPIC_KEY }}",
			},
			wantAbsentStrings: []string{
				"ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			step := GenerateMultiSecretValidationStep(tt.secretNames, tt.secretExpressions, tt.engineName, tt.docsURL)
			stepContent := strings.Join(step, "\n")

			for _, want := range tt.wantStrings {
				if !strings.Contains(stepContent, want) {
					t.Errorf("GenerateMultiSecretValidationStep() missing expected string:\nwant: %s\ngot: %s", want, stepContent)
				}
			}

			for _, absent := range tt.wantAbsentStrings {
				if strings.Contains(stepContent, absent) {
					t.Errorf("GenerateMultiSecretValidationStep() should not contain:\nunwanted: %s\ngot: %s", absent, stepContent)
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

			// Verify all secrets are passed as environment variable keys (with any expression)
			for _, secretName := range tt.secretNames {
				if !strings.Contains(stepContent, secretName+":") {
					t.Errorf("Expected step to have environment variable key: %s", secretName)
				}
			}

			// Verify step has id field
			if !strings.Contains(stepContent, "id: validate-secret") {
				t.Error("Expected step to have 'id: validate-secret' field")
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

// TestResolveEngineSecretExpression verifies that the helper returns the overridden expression
// when engine.env provides one, and falls back to the default otherwise.
func TestResolveEngineSecretExpression(t *testing.T) {
	tests := []struct {
		name      string
		secretKey string
		engineEnv map[string]string
		want      string
	}{
		{
			name:      "returns default when no engineEnv",
			secretKey: "COPILOT_GITHUB_TOKEN",
			engineEnv: nil,
			want:      "${{ secrets.COPILOT_GITHUB_TOKEN }}",
		},
		{
			name:      "returns default when engineEnv is empty",
			secretKey: "COPILOT_GITHUB_TOKEN",
			engineEnv: map[string]string{},
			want:      "${{ secrets.COPILOT_GITHUB_TOKEN }}",
		},
		{
			name:      "returns default when key not in engineEnv",
			secretKey: "COPILOT_GITHUB_TOKEN",
			engineEnv: map[string]string{"OTHER_VAR": "value"},
			want:      "${{ secrets.COPILOT_GITHUB_TOKEN }}",
		},
		{
			name:      "returns default when engineEnv value is not a secrets expression",
			secretKey: "COPILOT_GITHUB_TOKEN",
			engineEnv: map[string]string{"COPILOT_GITHUB_TOKEN": "plain-value"},
			want:      "${{ secrets.COPILOT_GITHUB_TOKEN }}",
		},
		{
			name:      "returns overridden expression when engineEnv provides secrets expression",
			secretKey: "COPILOT_GITHUB_TOKEN",
			engineEnv: map[string]string{"COPILOT_GITHUB_TOKEN": "${{ secrets.MY_SECRET }}"},
			want:      "${{ secrets.MY_SECRET }}",
		},
		{
			name:      "returns overridden expression for ANTHROPIC_API_KEY",
			secretKey: "ANTHROPIC_API_KEY",
			engineEnv: map[string]string{"ANTHROPIC_API_KEY": "${{ secrets.ORG_ANTHROPIC_KEY }}"},
			want:      "${{ secrets.ORG_ANTHROPIC_KEY }}",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := resolveEngineSecretExpression(tt.secretKey, tt.engineEnv)
			if got != tt.want {
				t.Errorf("resolveEngineSecretExpression(%q, %v) = %q, want %q", tt.secretKey, tt.engineEnv, got, tt.want)
			}
		})
	}
}

// TestCopilotEngineSecretValidationWithEnvOverride verifies that when engine.env overrides
// COPILOT_GITHUB_TOKEN, the validation step uses the overridden secret expression.
func TestCopilotEngineSecretValidationWithEnvOverride(t *testing.T) {
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

	// Env section should use the overridden secret expression
	if !strings.Contains(firstStep, "COPILOT_GITHUB_TOKEN: ${{ secrets.MY_SECRET }}") {
		t.Error("Validation step should use the overridden secret expression MY_SECRET")
	}
	// Default expression should NOT appear
	if strings.Contains(firstStep, "COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}") {
		t.Error("Validation step should NOT use the default COPILOT_GITHUB_TOKEN expression when overridden")
	}
	// Script args should still reference the env var name (not the secret name)
	if !strings.Contains(firstStep, "validate_multi_secret.sh COPILOT_GITHUB_TOKEN") {
		t.Error("Script args should still reference the env var name COPILOT_GITHUB_TOKEN")
	}
}

// TestClaudeEngineSecretValidationWithEnvOverride verifies that when engine.env overrides
// ANTHROPIC_API_KEY, the validation step uses the overridden secret expression.
func TestClaudeEngineSecretValidationWithEnvOverride(t *testing.T) {
	engine := NewClaudeEngine()
	workflowData := &WorkflowData{
		EngineConfig: &EngineConfig{
			ID: "claude",
			Env: map[string]string{
				"ANTHROPIC_API_KEY": "${{ secrets.ORG_CLAUDE_KEY }}",
			},
		},
	}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	firstStep := strings.Join(steps[0], "\n")

	if !strings.Contains(firstStep, "ANTHROPIC_API_KEY: ${{ secrets.ORG_CLAUDE_KEY }}") {
		t.Error("Validation step should use the overridden secret expression ORG_CLAUDE_KEY")
	}
	if strings.Contains(firstStep, "ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}") {
		t.Error("Validation step should NOT use the default ANTHROPIC_API_KEY expression when overridden")
	}
}
