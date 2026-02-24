package cli

import (
	"strings"

	"github.com/github/gh-aw/pkg/logger"
)

var firewallLogLevelCodemodLog = logger.New("cli:codemod_firewall_log_level")

// getFirewallLogLevelRemovalCodemod creates a codemod for removing the deprecated log-level field from network.firewall
func getFirewallLogLevelRemovalCodemod() Codemod {
	return Codemod{
		ID:           "firewall-log-level-removal",
		Name:         "Remove deprecated network.firewall.log-level field",
		Description:  "Removes the deprecated 'network.firewall.log-level' field (AWF always uses the default log level)",
		IntroducedIn: "0.1.0",
		Apply: func(content string, frontmatter map[string]any) (string, bool, error) {
			// Check if network exists
			networkValue, hasNetwork := frontmatter["network"]
			if !hasNetwork {
				return content, false, nil
			}

			networkMap, ok := networkValue.(map[string]any)
			if !ok {
				return content, false, nil
			}

			// Check if firewall exists and is an object
			firewallValue, hasFirewall := networkMap["firewall"]
			if !hasFirewall {
				return content, false, nil
			}

			firewallMap, ok := firewallValue.(map[string]any)
			if !ok {
				return content, false, nil
			}

			// Check if log-level field exists (supports both hyphen and underscore variants)
			_, hasLogLevel := firewallMap["log-level"]
			_, hasLogLevelUnderscore := firewallMap["log_level"]
			if !hasLogLevel && !hasLogLevelUnderscore {
				return content, false, nil
			}

			// Parse frontmatter to get raw lines
			frontmatterLines, markdown, err := parseFrontmatterLines(content)
			if err != nil {
				return content, false, err
			}

			// Remove the log-level field from the firewall block in network
			var result []string
			var modified bool
			var inNetworkBlock bool
			var networkIndent string
			var inFirewallBlock bool
			var firewallIndent string
			var inLogLevelField bool

			for i, line := range frontmatterLines {
				trimmedLine := strings.TrimSpace(line)

				// Track if we're in the network block
				if strings.HasPrefix(trimmedLine, "network:") {
					inNetworkBlock = true
					networkIndent = getIndentation(line)
					result = append(result, line)
					continue
				}

				// Check if we've left the network block
				if inNetworkBlock && len(trimmedLine) > 0 && !strings.HasPrefix(trimmedLine, "#") {
					if hasExitedBlock(line, networkIndent) {
						inNetworkBlock = false
						inFirewallBlock = false
					}
				}

				// Track if we're in the firewall block within network
				if inNetworkBlock && strings.HasPrefix(trimmedLine, "firewall:") {
					inFirewallBlock = true
					firewallIndent = getIndentation(line)
					result = append(result, line)
					continue
				}

				// Check if we've left the firewall block
				if inFirewallBlock && len(trimmedLine) > 0 && !strings.HasPrefix(trimmedLine, "#") {
					if hasExitedBlock(line, firewallIndent) {
						inFirewallBlock = false
						inLogLevelField = false
					}
				}

				// Remove log-level field line if in firewall block (both hyphen and underscore forms)
				if inFirewallBlock && (strings.HasPrefix(trimmedLine, "log-level:") || strings.HasPrefix(trimmedLine, "log_level:")) {
					modified = true
					inLogLevelField = true
					firewallLogLevelCodemodLog.Printf("Removed network.firewall.log-level on line %d", i+1)
					continue
				}

				// Skip any nested content under the log-level field
				if inLogLevelField {
					if len(trimmedLine) == 0 {
						continue
					}

					currentIndent := getIndentation(line)
					logLevelIndent := firewallIndent + "  "

					if len(currentIndent) > len(logLevelIndent) {
						firewallLogLevelCodemodLog.Printf("Removed nested log-level property on line %d: %s", i+1, trimmedLine)
						continue
					}
					inLogLevelField = false
				}

				result = append(result, line)
			}

			if !modified {
				return content, false, nil
			}

			// Reconstruct the content
			newContent := reconstructContent(result, markdown)
			firewallLogLevelCodemodLog.Print("Applied network.firewall.log-level removal")
			return newContent, true, nil
		},
	}
}
