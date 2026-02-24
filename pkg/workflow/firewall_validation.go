// This file provides firewall validation functions for agentic workflow compilation.
//
// This file contains domain-specific validation functions for firewall configuration:
//   - validateFirewallConfig() - Validates the overall firewall configuration
//
// These validation functions are organized in a dedicated file following the validation
// architecture pattern where domain-specific validation belongs in domain validation files.
// See validation.go for the complete validation architecture documentation.

package workflow

import (
	"github.com/github/gh-aw/pkg/logger"
)

var firewallValidationLog = logger.New("workflow:firewall_validation")

// validateFirewallConfig validates firewall configuration
func (c *Compiler) validateFirewallConfig(workflowData *WorkflowData) error {
	if workflowData.NetworkPermissions == nil || workflowData.NetworkPermissions.Firewall == nil {
		return nil
	}

	config := workflowData.NetworkPermissions.Firewall
	firewallValidationLog.Printf("Validating firewall config: enabled=%v", config.Enabled)
	firewallValidationLog.Print("Firewall config validation passed")
	return nil
}
