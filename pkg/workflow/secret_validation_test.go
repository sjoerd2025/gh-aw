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

// TestGenerateMultiSecretValidationStepWithEnvOverrides verifies that engine.env entries
// override the default ${{ secrets.SECRET_NAME }} expression in the validation step's env block.
func TestGenerateMultiSecretValidationStepWithEnvOverrides(t *testing.T) {
	tests := []struct {
		name         string
		secretNames  []string
		engineName   string
		docsURL      string
		envOverrides map[string]string
		wantStrings  []string
		noStrings    []string // must NOT appear in the output
	}{
		{
			name:        "single override replaces default expression",
			secretNames: []string{"COPILOT_GITHUB_TOKEN"},
			engineName:  "GitHub Copilot CLI",
			docsURL:     "https://github.github.com/gh-aw/reference/engines/#github-copilot-default",
			envOverrides: map[string]string{
				"COPILOT_GITHUB_TOKEN": "${{ secrets.MY_SECRET }}",
			},
			wantStrings: []string{
				"COPILOT_GITHUB_TOKEN: ${{ secrets.MY_SECRET }}",
				"id: validate-secret",
				"validate_multi_secret.sh",
			},
			noStrings: []string{
				"COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}",
			},
		},
		{
			name:        "partial override: only the overridden key changes",
			secretNames: []string{"CODEX_API_KEY", "OPENAI_API_KEY"},
			engineName:  "Codex",
			docsURL:     "https://github.github.com/gh-aw/reference/engines/#openai-codex",
			envOverrides: map[string]string{
				"CODEX_API_KEY": "${{ secrets.MY_CODEX_KEY }}",
			},
			wantStrings: []string{
				"CODEX_API_KEY: ${{ secrets.MY_CODEX_KEY }}",
				"OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}", // unchanged
			},
			noStrings: []string{
				"CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}",
			},
		},
		{
			name:         "nil override map is treated as no overrides",
			secretNames:  []string{"ANTHROPIC_API_KEY"},
			engineName:   "Claude Code",
			docsURL:      "https://github.github.com/gh-aw/reference/engines/#anthropic-claude-code",
			envOverrides: nil,
			wantStrings: []string{
				"ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}",
			},
		},
		{
			name:        "unrelated env override does not affect secret expressions",
			secretNames: []string{"COPILOT_GITHUB_TOKEN"},
			engineName:  "GitHub Copilot CLI",
			docsURL:     "https://github.github.com/gh-aw/reference/engines/#github-copilot-default",
			envOverrides: map[string]string{
				"SOME_OTHER_VAR": "some-value",
			},
			wantStrings: []string{
				"COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			step := GenerateMultiSecretValidationStep(tt.secretNames, tt.engineName, tt.docsURL, tt.envOverrides)
			stepContent := strings.Join(step, "\n")

			for _, want := range tt.wantStrings {
				if !strings.Contains(stepContent, want) {
					t.Errorf("want %q in step output, got:\n%s", want, stepContent)
				}
			}
			for _, no := range tt.noStrings {
				if strings.Contains(stepContent, no) {
					t.Errorf("did not want %q in step output, got:\n%s", no, stepContent)
				}
			}
		})
	}
}

// TestCopilotValidationStepHonoursEngineEnvOverride checks that when the user provides
// engine.env.COPILOT_GITHUB_TOKEN, the validation step uses the overridden expression.
func TestCopilotValidationStepHonoursEngineEnvOverride(t *testing.T) {
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

	if !strings.Contains(firstStep, "COPILOT_GITHUB_TOKEN: ${{ secrets.MY_SECRET }}") {
		t.Error("Validation step should use overridden token expression from engine.env")
	}
	if strings.Contains(firstStep, "COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}") {
		t.Error("Validation step must not use default token expression when engine.env overrides it")
	}
}

// TestClaudeValidationStepHonoursEngineEnvOverride checks that when the user provides
// engine.env.ANTHROPIC_API_KEY, the validation step uses the overridden expression.
func TestClaudeValidationStepHonoursEngineEnvOverride(t *testing.T) {
	engine := NewClaudeEngine()
	workflowData := &WorkflowData{
		EngineConfig: &EngineConfig{
			ID: "claude",
			Env: map[string]string{
				"ANTHROPIC_API_KEY": "${{ secrets.MY_ANTHROPIC_KEY }}",
			},
		},
	}

	steps := engine.GetInstallationSteps(workflowData)
	if len(steps) < 1 {
		t.Fatal("Expected at least one installation step")
	}

	firstStep := strings.Join(steps[0], "\n")

	if !strings.Contains(firstStep, "ANTHROPIC_API_KEY: ${{ secrets.MY_ANTHROPIC_KEY }}") {
		t.Error("Validation step should use overridden token expression from engine.env")
	}
	if strings.Contains(firstStep, "ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}") {
		t.Error("Validation step must not use default token expression when engine.env overrides it")
	}
}

// TestCodexValidationStepHonoursEngineEnvOverride checks that when the user provides
// engine.env overrides for Codex secrets, the validation step uses the overridden expressions.
func TestCodexValidationStepHonoursEngineEnvOverride(t *testing.T) {
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
		t.Error("Validation step should use overridden expression for CODEX_API_KEY")
	}
	if strings.Contains(firstStep, "CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}") {
		t.Error("Validation step must not use default expression for CODEX_API_KEY when overridden")
	}
	// Non-overridden key must keep its default expression
	if !strings.Contains(firstStep, "OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}") {
		t.Error("Non-overridden OPENAI_API_KEY should still use default expression")
	}
}

// TestValidationStepDefaultsUnchangedWithoutOverride confirms that existing behaviour is
// preserved when no engine.env overrides are provided (regression guard).
func TestValidationStepDefaultsUnchangedWithoutOverride(t *testing.T) {
	engines := []struct {
		name        string
		engine      CodingAgentEngine
		wantSecrets []string
	}{
		{"copilot", NewCopilotEngine(), []string{"COPILOT_GITHUB_TOKEN: ${{ secrets.COPILOT_GITHUB_TOKEN }}"}},
		{"claude", NewClaudeEngine(), []string{"ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}"}},
		{"codex", NewCodexEngine(), []string{
			"CODEX_API_KEY: ${{ secrets.CODEX_API_KEY }}",
			"OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}",
		}},
	}

	for _, tt := range engines {
		t.Run(tt.name, func(t *testing.T) {
			steps := tt.engine.GetInstallationSteps(&WorkflowData{})
			if len(steps) < 1 {
				t.Fatal("Expected at least one installation step")
			}
			firstStep := strings.Join(steps[0], "\n")
			for _, want := range tt.wantSecrets {
				if !strings.Contains(firstStep, want) {
					t.Errorf("want default expression %q in validation step, got:\n%s", want, firstStep)
				}
			}
		})
	}
}
