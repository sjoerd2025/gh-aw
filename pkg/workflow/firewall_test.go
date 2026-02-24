//go:build !integration

package workflow

import (
	"testing"
)

// TestValidateFirewallConfig tests the validateFirewallConfig method
func TestValidateFirewallConfig(t *testing.T) {
	tests := []struct {
		name         string
		workflowData *WorkflowData
		expectErr    bool
	}{
		{
			name: "no firewall config (allowed)",
			workflowData: &WorkflowData{
				NetworkPermissions: &NetworkPermissions{},
			},
			expectErr: false,
		},
		{
			name:         "no network permissions (allowed)",
			workflowData: &WorkflowData{},
			expectErr:    false,
		},
		{
			name: "firewall enabled (allowed)",
			workflowData: &WorkflowData{
				NetworkPermissions: &NetworkPermissions{
					Firewall: &FirewallConfig{
						Enabled: true,
					},
				},
			},
			expectErr: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			compiler := NewCompiler()
			err := compiler.validateFirewallConfig(tt.workflowData)
			if tt.expectErr {
				if err == nil {
					t.Errorf("validateFirewallConfig() expected error but got none")
				}
			} else {
				if err != nil {
					t.Errorf("validateFirewallConfig() unexpected error: %v", err)
				}
			}
		})
	}
}

// TestGetSSLBumpArgs tests the getSSLBumpArgs helper function
func TestGetSSLBumpArgs(t *testing.T) {
	tests := []struct {
		name     string
		config   *FirewallConfig
		expected []string
	}{
		{
			name:     "nil config returns empty slice",
			config:   nil,
			expected: nil,
		},
		{
			name:     "SSLBump disabled returns empty slice",
			config:   &FirewallConfig{Enabled: true, SSLBump: false},
			expected: nil,
		},
		{
			name:     "SSLBump enabled without AllowURLs returns only ssl-bump flag",
			config:   &FirewallConfig{Enabled: true, SSLBump: true},
			expected: []string{"--ssl-bump"},
		},
		{
			name: "SSLBump enabled with single AllowURL returns both flags",
			config: &FirewallConfig{
				Enabled:   true,
				SSLBump:   true,
				AllowURLs: []string{"https://github.com/githubnext/*"},
			},
			expected: []string{"--ssl-bump", "--allow-urls", "https://github.com/githubnext/*"},
		},
		{
			name: "SSLBump enabled with multiple AllowURLs returns comma-separated",
			config: &FirewallConfig{
				Enabled:   true,
				SSLBump:   true,
				AllowURLs: []string{"https://github.com/githubnext/*", "https://api.github.com/repos/*"},
			},
			expected: []string{"--ssl-bump", "--allow-urls", "https://github.com/githubnext/*,https://api.github.com/repos/*"},
		},
		{
			name: "Empty AllowURLs slice does not add allow-urls flag",
			config: &FirewallConfig{
				Enabled:   true,
				SSLBump:   true,
				AllowURLs: []string{},
			},
			expected: []string{"--ssl-bump"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := getSSLBumpArgs(tt.config)

			if tt.expected == nil && result != nil {
				t.Errorf("getSSLBumpArgs() = %v, expected nil", result)
				return
			}
			if len(result) != len(tt.expected) {
				t.Errorf("getSSLBumpArgs() = %v, expected %v", result, tt.expected)
				return
			}
			for i, v := range result {
				if v != tt.expected[i] {
					t.Errorf("getSSLBumpArgs()[%d] = %v, expected %v", i, v, tt.expected[i])
				}
			}
		})
	}
}
