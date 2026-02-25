package workflow

import (
	"fmt"
	"maps"
	"strings"

	"github.com/github/gh-aw/pkg/constants"
	"github.com/github/gh-aw/pkg/logger"
)

var opencodeLog = logger.New("workflow:opencode_engine")

// OpenCodeEngine represents the OpenCode CLI agentic engine.
// OpenCode is a provider-agnostic, open-source AI coding agent that supports
// 75+ models via BYOK (Bring Your Own Key).
type OpenCodeEngine struct {
	BaseEngine
}

func NewOpenCodeEngine() *OpenCodeEngine {
	return &OpenCodeEngine{
		BaseEngine: BaseEngine{
			id:                     "opencode",
			displayName:            "OpenCode",
			description:            "OpenCode CLI with headless mode and multi-provider LLM support",
			experimental:           true,  // Start as experimental until smoke tests pass consistently
			supportsToolsAllowlist: false, // OpenCode manages its own tool permissions via opencode.jsonc
			supportsMaxTurns:       false, // No --max-turns flag in opencode run
			supportsWebFetch:       false, // Has built-in webfetch but not exposed via gh-aw neutral tools yet
			supportsWebSearch:      false, // Has built-in websearch but not exposed via gh-aw neutral tools yet
			supportsFirewall:       true,  // Supports AWF network sandboxing
			supportsPlugins:        false,
			supportsLLMGateway:     true, // Supports LLM gateway on port 10004
		},
	}
}

// SupportsLLMGateway returns the LLM gateway port for OpenCode engine
func (e *OpenCodeEngine) SupportsLLMGateway() int {
	return constants.OpenCodeLLMGatewayPort
}

// GetModelEnvVarName returns the native environment variable name that the OpenCode CLI uses
// for model selection. Setting OPENCODE_MODEL is equivalent to passing --model to the CLI.
func (e *OpenCodeEngine) GetModelEnvVarName() string {
	return constants.OpenCodeCLIModelEnvVar
}

// GetRequiredSecretNames returns the list of secrets required by the OpenCode engine.
// This includes ANTHROPIC_API_KEY as the default provider, plus any additional
// provider API keys from engine.env, and MCP/GitHub secrets as needed.
func (e *OpenCodeEngine) GetRequiredSecretNames(workflowData *WorkflowData) []string {
	opencodeLog.Print("Collecting required secrets for OpenCode engine")
	secrets := []string{"ANTHROPIC_API_KEY"} // Default provider

	// Allow additional provider API keys from engine.env overrides
	if workflowData.EngineConfig != nil && len(workflowData.EngineConfig.Env) > 0 {
		for key := range workflowData.EngineConfig.Env {
			if strings.HasSuffix(key, "_API_KEY") || strings.HasSuffix(key, "_KEY") {
				secrets = append(secrets, key)
			}
		}
	}

	// Add MCP gateway API key if MCP servers are present
	if HasMCPServers(workflowData) {
		opencodeLog.Print("Adding MCP_GATEWAY_API_KEY secret")
		secrets = append(secrets, "MCP_GATEWAY_API_KEY")
	}

	// Add GitHub token for GitHub MCP server if present
	if hasGitHubTool(workflowData.ParsedTools) {
		opencodeLog.Print("Adding GITHUB_MCP_SERVER_TOKEN secret")
		secrets = append(secrets, "GITHUB_MCP_SERVER_TOKEN")
	}

	// Add HTTP MCP header secret names
	headerSecrets := collectHTTPMCPHeaderSecrets(workflowData.Tools)
	for varName := range headerSecrets {
		secrets = append(secrets, varName)
	}
	if len(headerSecrets) > 0 {
		opencodeLog.Printf("Added %d HTTP MCP header secrets", len(headerSecrets))
	}

	// Add safe-inputs secret names
	if IsSafeInputsEnabled(workflowData.SafeInputs, workflowData) {
		safeInputsSecrets := collectSafeInputsSecrets(workflowData.SafeInputs)
		for varName := range safeInputsSecrets {
			secrets = append(secrets, varName)
		}
		if len(safeInputsSecrets) > 0 {
			opencodeLog.Printf("Added %d safe-inputs secrets", len(safeInputsSecrets))
		}
	}

	return secrets
}

// GetInstallationSteps returns the GitHub Actions steps needed to install OpenCode CLI
func (e *OpenCodeEngine) GetInstallationSteps(workflowData *WorkflowData) []GitHubActionStep {
	opencodeLog.Printf("Generating installation steps for OpenCode engine: workflow=%s", workflowData.Name)

	// Skip installation if custom command is specified
	if workflowData.EngineConfig != nil && workflowData.EngineConfig.Command != "" {
		opencodeLog.Printf("Skipping installation steps: custom command specified (%s)", workflowData.EngineConfig.Command)
		return []GitHubActionStep{}
	}

	var steps []GitHubActionStep

	// Define engine configuration for shared validation
	config := EngineInstallConfig{
		Secrets:         []string{"ANTHROPIC_API_KEY"},
		DocsURL:         "https://opencode.ai/docs/get-started/",
		NpmPackage:      "opencode-ai",
		Version:         string(constants.DefaultOpenCodeVersion),
		Name:            "OpenCode CLI",
		CliName:         "opencode",
		InstallStepName: "Install OpenCode CLI",
	}

	// Add secret validation step
	secretValidation := GenerateMultiSecretValidationStep(
		config.Secrets,
		config.Name,
		config.DocsURL,
		getEngineEnvOverrides(workflowData),
	)
	steps = append(steps, secretValidation)

	// Determine OpenCode version
	opencodeVersion := config.Version
	if workflowData.EngineConfig != nil && workflowData.EngineConfig.Version != "" {
		opencodeVersion = workflowData.EngineConfig.Version
	}

	// Add Node.js setup step first (before sandbox installation)
	npmSteps := GenerateNpmInstallSteps(
		config.NpmPackage,
		opencodeVersion,
		config.InstallStepName,
		config.CliName,
		true, // Include Node.js setup
	)

	if len(npmSteps) > 0 {
		steps = append(steps, npmSteps[0]) // Setup Node.js step
	}

	// Add AWF installation if firewall is enabled
	if isFirewallEnabled(workflowData) {
		firewallConfig := getFirewallConfig(workflowData)
		agentConfig := getAgentConfig(workflowData)
		var awfVersion string
		if firewallConfig != nil {
			awfVersion = firewallConfig.Version
		}

		awfInstall := generateAWFInstallationStep(awfVersion, agentConfig)
		if len(awfInstall) > 0 {
			steps = append(steps, awfInstall)
		}
	}

	// Add OpenCode CLI installation step after sandbox installation
	if len(npmSteps) > 1 {
		steps = append(steps, npmSteps[1:]...)
	}

	return steps
}

// GetDeclaredOutputFiles returns the output files that OpenCode may produce.
func (e *OpenCodeEngine) GetDeclaredOutputFiles() []string {
	return []string{}
}

// GetExecutionSteps returns the GitHub Actions steps for executing OpenCode
func (e *OpenCodeEngine) GetExecutionSteps(workflowData *WorkflowData, logFile string) []GitHubActionStep {
	opencodeLog.Printf("Generating execution steps for OpenCode engine: workflow=%s, firewall=%v",
		workflowData.Name, isFirewallEnabled(workflowData))

	var steps []GitHubActionStep

	// Step 1: Write opencode.jsonc config (permissions)
	configStep := e.generateOpenCodeConfigStep(workflowData)
	steps = append(steps, configStep)

	// Step 2: Build CLI arguments
	var opencodeArgs []string

	modelConfigured := workflowData.EngineConfig != nil && workflowData.EngineConfig.Model != ""

	// Quiet mode for CI (suppress spinner)
	opencodeArgs = append(opencodeArgs, "-q")

	// Prompt from file
	opencodeArgs = append(opencodeArgs, "\"$(cat /tmp/gh-aw/aw-prompts/prompt.txt)\"")

	// Build command name
	commandName := "opencode"
	if workflowData.EngineConfig != nil && workflowData.EngineConfig.Command != "" {
		commandName = workflowData.EngineConfig.Command
	}
	opencodeCommand := fmt.Sprintf("%s run %s", commandName, shellJoinArgs(opencodeArgs))

	// AWF wrapping
	firewallEnabled := isFirewallEnabled(workflowData)
	var command string
	if firewallEnabled {
		allowedDomains := GetOpenCodeAllowedDomainsWithToolsAndRuntimes(
			workflowData.NetworkPermissions,
			workflowData.Tools,
			workflowData.Runtimes,
		)

		npmPathSetup := GetNpmBinPathSetup()
		opencodeCommandWithPath := fmt.Sprintf("%s && %s", npmPathSetup, opencodeCommand)

		llmGatewayPort := e.SupportsLLMGateway()
		usesAPIProxy := llmGatewayPort > 0

		command = BuildAWFCommand(AWFCommandConfig{
			EngineName:     "opencode",
			EngineCommand:  opencodeCommandWithPath,
			LogFile:        logFile,
			WorkflowData:   workflowData,
			UsesTTY:        false,
			UsesAPIProxy:   usesAPIProxy,
			AllowedDomains: allowedDomains,
		})
	} else {
		command = fmt.Sprintf("set -o pipefail\n%s 2>&1 | tee -a %s", opencodeCommand, logFile)
	}

	// Environment variables
	env := map[string]string{
		"ANTHROPIC_API_KEY": "${{ secrets.ANTHROPIC_API_KEY }}",
		"GH_AW_PROMPT":      "/tmp/gh-aw/aw-prompts/prompt.txt",
		"GITHUB_WORKSPACE":  "${{ github.workspace }}",
		"NO_PROXY":          "localhost,127.0.0.1",
	}

	// MCP config path
	if HasMCPServers(workflowData) {
		env["GH_AW_MCP_CONFIG"] = "${{ github.workspace }}/opencode.jsonc"
	}

	// LLM gateway base URL override (default Anthropic)
	if firewallEnabled {
		env["ANTHROPIC_BASE_URL"] = fmt.Sprintf("http://host.docker.internal:%d",
			constants.OpenCodeLLMGatewayPort)
	}

	// Safe outputs env
	applySafeOutputEnvToMap(env, workflowData)

	// Model env var (only when explicitly configured)
	if modelConfigured {
		opencodeLog.Printf("Setting %s env var for model: %s",
			constants.OpenCodeCLIModelEnvVar, workflowData.EngineConfig.Model)
		env[constants.OpenCodeCLIModelEnvVar] = workflowData.EngineConfig.Model
	}

	// Custom env from engine config (allows provider override)
	if workflowData.EngineConfig != nil && len(workflowData.EngineConfig.Env) > 0 {
		maps.Copy(env, workflowData.EngineConfig.Env)
	}

	// Agent config env
	agentConfig := getAgentConfig(workflowData)
	if agentConfig != nil && len(agentConfig.Env) > 0 {
		maps.Copy(env, agentConfig.Env)
	}

	// Build execution step
	stepLines := []string{
		"      - name: Execute OpenCode CLI",
		"        id: agentic_execution",
	}
	allowedSecrets := e.GetRequiredSecretNames(workflowData)
	filteredEnv := FilterEnvForSecrets(env, allowedSecrets)
	stepLines = FormatStepWithCommandAndEnv(stepLines, command, filteredEnv)

	steps = append(steps, GitHubActionStep(stepLines))
	return steps
}

// generateOpenCodeConfigStep writes opencode.jsonc with all permissions set to allow
// to prevent CI hanging on permission prompts.
func (e *OpenCodeEngine) generateOpenCodeConfigStep(_ *WorkflowData) GitHubActionStep {
	// Build the config JSON with all permissions set to allow
	configJSON := `{"agent":{"build":{"permissions":{"bash":"allow","edit":"allow","read":"allow","glob":"allow","grep":"allow","write":"allow","webfetch":"allow","websearch":"allow"}}}}`

	// Shell command to write or merge the config
	command := fmt.Sprintf(`mkdir -p "$GITHUB_WORKSPACE"
CONFIG="$GITHUB_WORKSPACE/opencode.jsonc"
BASE_CONFIG='%s'
if [ -f "$CONFIG" ]; then
  MERGED=$(jq -n --argjson base "$BASE_CONFIG" --argjson existing "$(cat "$CONFIG")" '$existing * $base')
  echo "$MERGED" > "$CONFIG"
else
  echo "$BASE_CONFIG" > "$CONFIG"
fi`, configJSON)

	stepLines := []string{"      - name: Write OpenCode configuration"}
	stepLines = FormatStepWithCommandAndEnv(stepLines, command, nil)
	return GitHubActionStep(stepLines)
}
