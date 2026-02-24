//go:build !integration

package workflow

import (
	"os"
	"strings"
	"testing"

	"github.com/github/gh-aw/pkg/stringutil"

	"github.com/github/gh-aw/pkg/testutil"
)

// TestLabelFilter tests the label name filter functionality for labeled/unlabeled events
func TestLabelFilter(t *testing.T) {
	// Create temporary directory for test files
	tmpDir := testutil.TempDir(t, "label-filter-test")

	compiler := NewCompiler()

	tests := []struct {
		name              string
		frontmatter       string
		expectedLabels    []string // Expected labels in the on: section (native filter)
		shouldHaveJobCond bool     // Whether an activation job if: condition for label.name should be present
	}{
		{
			name: "issues with labeled and single label name",
			frontmatter: `---
on:
  issues:
    types: [opened, labeled]
    names: bug

permissions:
  contents: read
  issues: write
  pull-requests: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [issue_read]
---`,
			expectedLabels:    []string{"bug"},
			shouldHaveJobCond: false,
		},
		{
			name: "issues with labeled and multiple label names",
			frontmatter: `---
on:
  issues:
    types: [labeled]
    names: [bug, enhancement, feature]

permissions:
  contents: read
  issues: write
  pull-requests: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [issue_read]
---`,
			expectedLabels:    []string{"bug", "enhancement", "feature"},
			shouldHaveJobCond: false,
		},
		{
			name: "issues with unlabeled and label names",
			frontmatter: `---
on:
  issues:
    types: [unlabeled]
    names: [wontfix, duplicate]

permissions:
  contents: read
  issues: write
  pull-requests: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [issue_read]
---`,
			expectedLabels:    []string{"wontfix", "duplicate"},
			shouldHaveJobCond: false,
		},
		{
			name: "issues with both labeled and unlabeled",
			frontmatter: `---
on:
  issues:
    types: [labeled, unlabeled]
    names: [priority, urgent]

permissions:
  contents: read
  issues: write
  pull-requests: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [issue_read]
---`,
			expectedLabels:    []string{"priority", "urgent"},
			shouldHaveJobCond: false,
		},
		{
			name: "pull_request with labeled and label names",
			frontmatter: `---
on:
  pull_request:
    types: [opened, labeled]
    names: ready-for-review

permissions:
  contents: read
  pull-requests: write
  issues: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [get_pull_request]
---`,
			expectedLabels:    []string{"ready-for-review"},
			shouldHaveJobCond: false,
		},
		{
			name: "issues without labeled/unlabeled types",
			frontmatter: `---
on:
  issues:
    types: [opened, edited]
    names: bug

permissions:
  contents: read
  issues: write
  pull-requests: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [issue_read]
---`,
			expectedLabels:    nil,
			shouldHaveJobCond: false,
		},
		{
			name: "issues with labeled but no names field",
			frontmatter: `---
on:
  issues:
    types: [labeled]

permissions:
  contents: read
  issues: write
  pull-requests: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [issue_read]
---`,
			expectedLabels:    nil,
			shouldHaveJobCond: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create test file
			testFile := tmpDir + "/test-label-filter.md"
			content := tt.frontmatter + "\n\n# Test Workflow\n\nTest label filtering."
			if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
				t.Fatal(err)
			}

			// Compile the workflow
			err := compiler.CompileWorkflow(testFile)
			if err != nil {
				t.Fatalf("Failed to compile workflow: %v", err)
			}

			// Read the generated lock file
			lockFile := stringutil.MarkdownToLockFile(testFile)
			lockBytes, err := os.ReadFile(lockFile)
			if err != nil {
				t.Fatal(err)
			}
			lockContent := string(lockBytes)

			// Check that native labels: appear in the on: section
			for _, label := range tt.expectedLabels {
				if !strings.Contains(lockContent, "- "+label) {
					t.Errorf("Expected label '%s' to appear under labels: in generated workflow, got:\n%s", label, lockContent)
				}
			}

			// Check that no label.name job condition is generated for native-filtered events
			if tt.shouldHaveJobCond {
				if !strings.Contains(lockContent, "github.event.label.name") {
					t.Errorf("Expected 'github.event.label.name' condition to be present in generated workflow")
				}
			} else if len(tt.expectedLabels) > 0 {
				// When using native filtering, label.name should NOT appear in job conditions
				if strings.Contains(lockContent, "github.event.label.name") {
					t.Errorf("Expected no 'github.event.label.name' job condition when native label filtering is used, got:\n%s", lockContent)
				}
			}

			// Clean up test file
			os.Remove(testFile)
			os.Remove(lockFile)
		})
	}
}

// TestLabelFilterNative tests that the names field is converted to labels: in the on: section
// for issues/pull_request with labeled/unlabeled types (native GitHub Actions label filtering)
func TestLabelFilterNative(t *testing.T) {
	tmpDir := testutil.TempDir(t, "label-filter-native-test")

	compiler := NewCompiler()

	frontmatter := `---
on:
  issues:
    types: [labeled, unlabeled]
    names: [bug, enhancement]

permissions:
  contents: read
  issues: write
  pull-requests: read

strict: false
features:
  dangerous-permissions-write: true
tools:
  github:
    allowed: [issue_read]
---`

	testFile := tmpDir + "/test-native.md"
	content := frontmatter + "\n\n# Test Workflow\n\nTest native label filter."
	if err := os.WriteFile(testFile, []byte(content), 0644); err != nil {
		t.Fatal(err)
	}

	if err := compiler.CompileWorkflow(testFile); err != nil {
		t.Fatalf("Failed to compile workflow: %v", err)
	}

	lockFile := stringutil.MarkdownToLockFile(testFile)
	lockBytes, err := os.ReadFile(lockFile)
	if err != nil {
		t.Fatal(err)
	}
	lockContent := string(lockBytes)

	// Check that labels: field is present (native GitHub Actions filter)
	if !strings.Contains(lockContent, "labels:") {
		t.Error("Expected 'labels:' field to be present in generated workflow on: section")
	}

	// Check that label names appear as list items
	if !strings.Contains(lockContent, "- bug") || !strings.Contains(lockContent, "- enhancement") {
		t.Error("Expected label names to appear as list items under labels:")
	}

	// Check that names: is NOT commented out (it's been replaced by labels:)
	if strings.Contains(lockContent, "# names:") {
		t.Error("Expected 'names:' to be replaced by 'labels:', not commented out")
	}

	// Check that no job condition for label.name is generated (native filter handles it)
	if strings.Contains(lockContent, "github.event.label.name") {
		t.Error("Expected no 'github.event.label.name' job condition when native label filtering is used")
	}
}
