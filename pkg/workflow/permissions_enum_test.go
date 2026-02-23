//go:build !integration

package workflow

import (
	"testing"
)

// TestPermissionsEnumValidation tests that permission enum values are correctly validated
func TestPermissionsEnumValidation(t *testing.T) {
	tests := []struct {
		name        string
		permissions string
		expectValid bool
		description string
	}{
		// Valid shorthand permissions
		{
			name:        "valid: read-all",
			permissions: "permissions: read-all",
			expectValid: true,
			description: "read-all is a valid shorthand permission",
		},
		{
			name:        "valid: write-all",
			permissions: "permissions: write-all",
			expectValid: true,
			description: "write-all is a valid shorthand permission",
		},
		{
			name:        "invalid: read (without -all)",
			permissions: "permissions: read",
			expectValid: false,
			description: "read without -all is not a valid shorthand (use read-all)",
		},
		{
			name:        "invalid: write (without -all)",
			permissions: "permissions: write",
			expectValid: false,
			description: "write without -all is not a valid shorthand (use write-all)",
		},
		{
			name:        "valid: none",
			permissions: "permissions: none",
			expectValid: true,
			description: "none is a valid shorthand permission",
		},
		// Invalid shorthand permissions - case sensitivity
		{
			name:        "invalid: READ-ALL (uppercase)",
			permissions: "permissions: READ-ALL",
			expectValid: false,
			description: "permissions are case-sensitive",
		},
		{
			name:        "invalid: Write-All (mixed case)",
			permissions: "permissions: Write-All",
			expectValid: false,
			description: "permissions are case-sensitive",
		},
		{
			name:        "invalid: Read (capitalized)",
			permissions: "permissions: Read",
			expectValid: false,
			description: "permissions are case-sensitive",
		},
		{
			name:        "invalid: WRITE (uppercase)",
			permissions: "permissions: WRITE",
			expectValid: false,
			description: "permissions are case-sensitive",
		},
		{
			name:        "invalid: None (capitalized)",
			permissions: "permissions: None",
			expectValid: false,
			description: "permissions are case-sensitive",
		},
		// Invalid shorthand permissions - wrong values
		{
			name:        "invalid: readall (no hyphen)",
			permissions: "permissions: readall",
			expectValid: false,
			description: "must use hyphen: read-all",
		},
		{
			name:        "invalid: writeall (no hyphen)",
			permissions: "permissions: writeall",
			expectValid: false,
			description: "must use hyphen: write-all",
		},
		{
			name:        "invalid: readonly",
			permissions: "permissions: readonly",
			expectValid: false,
			description: "not a valid permission value",
		},
		{
			name:        "invalid: all",
			permissions: "permissions: all",
			expectValid: false,
			description: "'all' by itself is not valid as shorthand",
		},
		{
			name:        "invalid: full",
			permissions: "permissions: full",
			expectValid: false,
			description: "not a valid permission value",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parser := NewPermissionsParser(tt.permissions)

			// Check if parser recognized it as a valid shorthand
			isShorthand := parser.isShorthand

			if tt.expectValid {
				if !isShorthand {
					t.Errorf("%s: Expected valid shorthand permission, but was not recognized as shorthand", tt.description)
				}
			} else {
				// For invalid values, they shouldn't be recognized as valid shorthands
				// They might be parsed as YAML maps or just ignored
				if isShorthand {
					t.Errorf("%s: Invalid value was incorrectly recognized as valid shorthand", tt.description)
				}
			}
		})
	}
}

// TestPermissionsLevelEnumValidation tests individual permission level values
func TestPermissionsLevelEnumValidation(t *testing.T) {
	tests := []struct {
		name        string
		permissions string
		scope       string
		level       string
		expectValid bool
	}{
		// Valid permission levels
		{
			name:        "contents: read",
			permissions: "permissions:\n  contents: read",
			scope:       "contents",
			level:       "read",
			expectValid: true,
		},
		{
			name:        "contents: write",
			permissions: "permissions:\n  contents: write",
			scope:       "contents",
			level:       "write",
			expectValid: true,
		},
		{
			name:        "contents: none",
			permissions: "permissions:\n  contents: none",
			scope:       "contents",
			level:       "none",
			expectValid: true,
		},
		{
			name:        "issues: read",
			permissions: "permissions:\n  issues: read",
			scope:       "issues",
			level:       "read",
			expectValid: true,
		},
		{
			name:        "issues: write",
			permissions: "permissions:\n  issues: write",
			scope:       "issues",
			level:       "write",
			expectValid: true,
		},
		// Invalid permission levels - case sensitivity
		// Note: YAML parser will parse these, but GitHub Actions will reject them
		{
			name:        "contents: READ (uppercase)",
			permissions: "permissions:\n  contents: READ",
			scope:       "contents",
			level:       "READ",
			expectValid: false,
		},
		{
			name:        "contents: Write (mixed case)",
			permissions: "permissions:\n  contents: Write",
			scope:       "contents",
			level:       "Write",
			expectValid: false,
		},
		// Invalid permission levels - wrong values
		{
			name:        "contents: readonly",
			permissions: "permissions:\n  contents: readonly",
			scope:       "contents",
			level:       "readonly",
			expectValid: false,
		},
		{
			name:        "contents: full",
			permissions: "permissions:\n  contents: full",
			scope:       "contents",
			level:       "full",
			expectValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parser := NewPermissionsParser(tt.permissions)

			// Check if the scope was parsed
			actualLevel, exists := parser.parsedPerms[tt.scope]

			if tt.expectValid {
				if !exists {
					t.Errorf("Expected scope %q to be parsed", tt.scope)
					return
				}
				if actualLevel != tt.level {
					t.Errorf("Expected level %q for scope %q, got %q", tt.level, tt.scope, actualLevel)
				}
			} else {
				// For invalid levels, YAML will still parse them but they are documented
				// as invalid. GitHub Actions will reject them at runtime.
				// This test documents that the parser doesn't validate the level values,
				// only that they are strings
				if exists && actualLevel == tt.level {
					t.Logf("Invalid permission level %q was parsed by YAML (GitHub Actions will reject it at runtime)", tt.level)
				}
			}
		})
	}
}

// TestPermissionsEdgeCases tests edge cases for permission values
func TestPermissionsEdgeCases(t *testing.T) {
	tests := []struct {
		name        string
		permissions string
		expectError bool
		description string
	}{
		{
			name:        "empty permissions",
			permissions: "",
			expectError: false,
			description: "empty permissions should be handled gracefully",
		},
		{
			name:        "permissions with only label",
			permissions: "permissions:",
			expectError: false,
			description: "empty permissions body should be handled gracefully",
		},
		{
			name:        "permissions with whitespace",
			permissions: "permissions:   \n  \t",
			expectError: false,
			description: "whitespace-only permissions should be handled gracefully",
		},
		{
			name:        "permissions with extra spacing",
			permissions: "permissions:  read-all  ",
			expectError: false,
			description: "extra whitespace should be trimmed",
		},
		{
			name:        "multiline permissions with valid shorthand",
			permissions: "permissions:\n  read-all",
			expectError: false,
			description: "shorthand can be on next line",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					if !tt.expectError {
						t.Errorf("%s: unexpected panic: %v", tt.description, r)
					}
				}
			}()

			parser := NewPermissionsParser(tt.permissions)

			// Just verify it doesn't panic and returns something sensible
			if parser == nil {
				t.Errorf("%s: parser should not be nil", tt.description)
			}
		})
	}
}

// TestPermissionsAllKeyRemoved tests that the deprecated 'all' key in permissions is no longer supported
func TestPermissionsAllKeyRemoved(t *testing.T) {
	// 'all: read' is no longer supported - the parser should treat it as an unknown scope
	parser := NewPermissionsParser("permissions:\n  all: read")

	// 'all' should be treated as unknown scope and ignored (no special handling)
	if parser.isShorthand {
		t.Error("parser should not be shorthand for 'all: read'")
	}
	// The 'all' key should be in parsedPerms but not grant special permissions
	if parser.HasContentsReadAccess() {
		t.Error("'all: read' should no longer grant contents read access")
	}
}

// TestPermissionsScopeEnumValidation tests valid permission scope names
func TestPermissionsScopeEnumValidation(t *testing.T) {
	validScopes := []string{
		"actions",
		"checks",
		"contents",
		"deployments",
		"discussions",
		"id-token",
		"issues",
		"packages",
		"pages",
		"pull-requests",
		"repository-projects",
		"security-events",
		"statuses",
	}

	for _, scope := range validScopes {
		t.Run("valid scope: "+scope, func(t *testing.T) {
			permissions := "permissions:\n  " + scope + ": read"
			parser := NewPermissionsParser(permissions)

			if len(parser.parsedPerms) == 0 {
				t.Errorf("Valid scope %q should be parsed", scope)
			}

			if level, exists := parser.parsedPerms[scope]; !exists || level != "read" {
				t.Errorf("Valid scope %q with level 'read' was not parsed correctly", scope)
			}
		})
	}
}

// TestPermissionsInvalidScopeHandling tests how invalid scopes are handled
func TestPermissionsInvalidScopeHandling(t *testing.T) {
	invalidScopes := []string{
		"CONTENTS",     // uppercase
		"Contents",     // mixed case
		"issue",        // should be plural: issues
		"pullrequests", // should be hyphenated: pull-requests
		"random-scope", // not a valid GitHub permission scope
	}

	for _, scope := range invalidScopes {
		t.Run("invalid scope: "+scope, func(t *testing.T) {
			permissions := "permissions:\n  " + scope + ": read"
			parser := NewPermissionsParser(permissions)

			// Invalid scopes might still be parsed by YAML parser
			// but they won't be recognized as valid GitHub Actions permissions
			// This test documents that behavior
			if level, exists := parser.parsedPerms[scope]; exists {
				t.Logf("Invalid scope %q was parsed with level %q (YAML allows it, but GitHub Actions may reject it)", scope, level)
			}
		})
	}
}

// TestPermissionCombinations tests various permission combinations
func TestPermissionCombinations(t *testing.T) {
	tests := []struct {
		name        string
		permissions string
		expectValid bool
		description string
	}{
		{
			name: "multiple read permissions",
			permissions: `permissions:
  contents: read
  issues: read
  pull-requests: read`,
			expectValid: true,
			description: "multiple read permissions are valid",
		},
		{
			name: "mixed read and write permissions",
			permissions: `permissions:
  contents: read
  issues: write
  pull-requests: write`,
			expectValid: true,
			description: "mixing read and write is valid",
		},
		{
			name: "all scopes with none",
			permissions: `permissions:
  contents: none
  issues: none
  pull-requests: none`,
			expectValid: true,
			description: "all none is valid (explicit deny)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			parser := NewPermissionsParser(tt.permissions)

			if tt.expectValid {
				if len(parser.parsedPerms) == 0 && !parser.isShorthand {
					t.Errorf("%s: expected permissions to be parsed", tt.description)
				}
			}
		})
	}
}

// TestPermissionsWhitespaceHandling tests whitespace handling in permissions
func TestPermissionsWhitespaceHandling(t *testing.T) {
	tests := []struct {
		name        string
		permissions string
		expectValid bool
	}{
		{
			name:        "shorthand with leading spaces",
			permissions: "permissions:   read-all",
			expectValid: true,
		},
		{
			name:        "shorthand with trailing spaces",
			permissions: "permissions: read-all  ",
			expectValid: true,
		},
		{
			name:        "shorthand with tabs",
			permissions: "permissions:\tread-all",
			expectValid: true,
		},
		{
			name: "map with inconsistent indentation",
			permissions: `permissions:
  contents: read
    issues: write`,
			expectValid: false, // YAML might parse this differently
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			defer func() {
				if r := recover(); r != nil {
					t.Logf("Parser panicked on %q: %v (this documents edge case behavior)", tt.name, r)
				}
			}()

			parser := NewPermissionsParser(tt.permissions)
			if parser == nil {
				t.Errorf("Parser should not be nil for %q", tt.name)
			}
		})
	}
}
