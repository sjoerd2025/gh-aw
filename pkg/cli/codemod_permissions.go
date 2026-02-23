package cli

import (
	"fmt"
	"strings"

	"github.com/github/gh-aw/pkg/logger"
)

var permissionsAllCodemodLog = logger.New("cli:codemod_permissions_all")

// getPermissionsAllCodemod creates a codemod for converting "permissions:\n  all: read" to "permissions: read-all"
func getPermissionsAllCodemod() Codemod {
	return Codemod{
		ID:           "permissions-all-to-read-all",
		Name:         "Convert permissions all: read to read-all shorthand",
		Description:  "Converts 'permissions:\\n  all: read' map syntax to 'permissions: read-all' shorthand as the map syntax is no longer supported",
		IntroducedIn: "0.6.0",
		Apply: func(content string, frontmatter map[string]any) (string, bool, error) {
			// Check if permissions exist and is a map with an "all" key
			permissionsValue, hasPermissions := frontmatter["permissions"]
			if !hasPermissions {
				return content, false, nil
			}

			mapValue, isMap := permissionsValue.(map[string]any)
			if !isMap {
				return content, false, nil
			}

			allValue, hasAll := mapValue["all"]
			if !hasAll {
				return content, false, nil
			}

			allStr, ok := allValue.(string)
			if !ok || allStr != "read" {
				return content, false, nil
			}

			// Parse frontmatter to get raw lines
			frontmatterLines, markdown, err := parseFrontmatterLines(content)
			if err != nil {
				return content, false, err
			}

			// Find the permissions block and replace it
			var inPermissionsBlock bool
			var permissionsIndent string
			var permissionsLineIdx int
			var blockEndIdx int

			for i, line := range frontmatterLines {
				trimmedLine := strings.TrimSpace(line)
				if strings.HasPrefix(trimmedLine, "permissions:") {
					inPermissionsBlock = true
					permissionsIndent = getIndentation(line)
					permissionsLineIdx = i
					blockEndIdx = i
					continue
				}
				if inPermissionsBlock {
					if trimmedLine == "" || strings.HasPrefix(trimmedLine, "#") {
						blockEndIdx = i
						continue
					}
					if hasExitedBlock(line, permissionsIndent) {
						break
					}
					blockEndIdx = i
				}
			}

			if !inPermissionsBlock {
				return content, false, nil
			}

			// Replace the entire permissions block with "permissions: read-all"
			result := make([]string, 0, len(frontmatterLines))
			result = append(result, frontmatterLines[:permissionsLineIdx]...)
			result = append(result, permissionsIndent+"permissions: read-all")
			result = append(result, frontmatterLines[blockEndIdx+1:]...)
			permissionsAllCodemodLog.Printf("Replaced 'permissions: all: read' with 'permissions: read-all'")

			newContent := reconstructContent(result, markdown)
			return newContent, true, nil
		},
	}
}

var permissionsReadCodemodLog = logger.New("cli:codemod_permissions_read")

// getPermissionsReadCodemod creates a codemod for converting invalid "read" and "write" shorthands
func getPermissionsReadCodemod() Codemod {
	return Codemod{
		ID:           "permissions-read-to-read-all",
		Name:         "Convert invalid permissions shorthand",
		Description:  "Converts 'permissions: read' to 'permissions: read-all' and 'permissions: write' to 'permissions: write-all' as per GitHub Actions spec",
		IntroducedIn: "0.5.0",
		Apply: func(content string, frontmatter map[string]any) (string, bool, error) {
			// Check if permissions exist
			permissionsValue, hasPermissions := frontmatter["permissions"]
			if !hasPermissions {
				return content, false, nil
			}

			// Check if permissions uses invalid shorthand (read or write)
			hasInvalidShorthand := false
			if strValue, ok := permissionsValue.(string); ok {
				if strValue == "read" || strValue == "write" {
					hasInvalidShorthand = true
				}
			}

			if !hasInvalidShorthand {
				return content, false, nil
			}

			// Parse frontmatter to get raw lines
			frontmatterLines, markdown, err := parseFrontmatterLines(content)
			if err != nil {
				return content, false, err
			}

			// Find and replace invalid shorthand permissions
			var modified bool
			result := make([]string, len(frontmatterLines))

			for i, line := range frontmatterLines {
				trimmedLine := strings.TrimSpace(line)

				// Check for permissions line with shorthand
				if strings.HasPrefix(trimmedLine, "permissions:") {
					// Handle shorthand on same line: "permissions: read" or "permissions: write"
					if strings.Contains(trimmedLine, ": read") && !strings.Contains(trimmedLine, "read-all") && !strings.Contains(trimmedLine, ": read\n") {
						// Make sure it's "permissions: read" and not "contents: read"
						if strings.TrimSpace(strings.Split(line, ":")[0]) == "permissions" {
							result[i] = strings.Replace(line, ": read", ": read-all", 1)
							modified = true
							permissionsReadCodemodLog.Printf("Replaced 'permissions: read' with 'permissions: read-all' on line %d", i+1)
							continue
						}
					} else if strings.Contains(trimmedLine, ": write") && !strings.Contains(trimmedLine, "write-all") {
						// Make sure it's "permissions: write" and not "contents: write"
						if strings.TrimSpace(strings.Split(line, ":")[0]) == "permissions" {
							result[i] = strings.Replace(line, ": write", ": write-all", 1)
							modified = true
							permissionsReadCodemodLog.Printf("Replaced 'permissions: write' with 'permissions: write-all' on line %d", i+1)
							continue
						}
					}
				}

				result[i] = line
			}

			if !modified {
				return content, false, nil
			}

			// Reconstruct the content
			newContent := reconstructContent(result, markdown)
			permissionsReadCodemodLog.Print("Applied permissions read/write to read-all/write-all migration")
			return newContent, true, nil
		},
	}
}

var writePermissionsCodemodLog = logger.New("cli:codemod_permissions")

// getWritePermissionsCodemod creates a codemod for converting write permissions to read
func getWritePermissionsCodemod() Codemod {
	return Codemod{
		ID:           "write-permissions-to-read-migration",
		Name:         "Convert write permissions to read",
		Description:  "Converts all write permissions to read permissions to comply with the new security policy",
		IntroducedIn: "0.4.0",
		Apply: func(content string, frontmatter map[string]any) (string, bool, error) {
			// Check if permissions exist
			permissionsValue, hasPermissions := frontmatter["permissions"]
			if !hasPermissions {
				return content, false, nil
			}

			// Check if any write permissions exist
			hasWritePermissions := false

			// Handle string shorthand (write-all, write)
			if strValue, ok := permissionsValue.(string); ok {
				if strValue == "write-all" || strValue == "write" {
					hasWritePermissions = true
				}
			}

			// Handle map format
			if mapValue, ok := permissionsValue.(map[string]any); ok {
				for _, value := range mapValue {
					if strValue, ok := value.(string); ok && strValue == "write" {
						hasWritePermissions = true
						break
					}
				}
			}

			if !hasWritePermissions {
				return content, false, nil
			}

			// Parse frontmatter to get raw lines
			frontmatterLines, markdown, err := parseFrontmatterLines(content)
			if err != nil {
				return content, false, err
			}

			// Find and replace write permissions
			var modified bool
			var inPermissionsBlock bool
			var permissionsIndent string

			result := make([]string, len(frontmatterLines))

			for i, line := range frontmatterLines {
				trimmedLine := strings.TrimSpace(line)

				// Track if we're in the permissions block
				if strings.HasPrefix(trimmedLine, "permissions:") {
					inPermissionsBlock = true
					permissionsIndent = getIndentation(line)

					// Handle shorthand on same line: "permissions: write-all" or "permissions: write"
					if strings.Contains(trimmedLine, ": write-all") {
						result[i] = strings.Replace(line, ": write-all", ": read-all", 1)
						modified = true
						writePermissionsCodemodLog.Printf("Replaced permissions: write-all with permissions: read-all on line %d", i+1)
						continue
					} else if strings.Contains(trimmedLine, ": write") && !strings.Contains(trimmedLine, "write-all") {
						result[i] = strings.Replace(line, ": write", ": read", 1)
						modified = true
						writePermissionsCodemodLog.Printf("Replaced permissions: write with permissions: read on line %d", i+1)
						continue
					}

					result[i] = line
					continue
				}

				// Check if we've left the permissions block
				if inPermissionsBlock && len(trimmedLine) > 0 && !strings.HasPrefix(trimmedLine, "#") {
					if hasExitedBlock(line, permissionsIndent) {
						inPermissionsBlock = false
					}
				}

				// Replace write with read if in permissions block
				if inPermissionsBlock && strings.Contains(trimmedLine, ": write") {
					// Preserve indentation and everything else
					// Extract the key, value, and any trailing comment
					parts := strings.SplitN(line, ":", 2)
					if len(parts) >= 2 {
						key := parts[0]
						valueAndComment := parts[1]

						// Replace "write" with "read" in the value part
						newValueAndComment := strings.Replace(valueAndComment, " write", " read", 1)
						result[i] = fmt.Sprintf("%s:%s", key, newValueAndComment)
						modified = true
						writePermissionsCodemodLog.Printf("Replaced write with read on line %d", i+1)
					} else {
						result[i] = line
					}
				} else {
					result[i] = line
				}
			}

			if !modified {
				return content, false, nil
			}

			// Reconstruct the content
			newContent := reconstructContent(result, markdown)
			writePermissionsCodemodLog.Print("Applied write permissions to read migration")
			return newContent, true, nil
		},
	}
}
