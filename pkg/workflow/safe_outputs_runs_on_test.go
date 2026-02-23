//go:build !integration

package workflow

import (
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/github/gh-aw/pkg/testutil"

	"github.com/github/gh-aw/pkg/constants"
)

func TestSafeOutputsRunsOnConfiguration(t *testing.T) {
	tests := []struct {
		name           string
		frontmatter    string
		expectedRunsOn string
	}{
		{
			name: "default runs-on when not specified",
			frontmatter: `---
on: push
safe-outputs:
  create-issue:
    title-prefix: "[ai] "
---

# Test Workflow

This is a test workflow.`,
			expectedRunsOn: "runs-on: " + constants.DefaultActivationJobRunnerImage,
		},
		{
			name: "custom runs-on string",
			frontmatter: `---
on: push
safe-outputs:
  create-issue:
    title-prefix: "[ai] "
  runs-on: windows-latest
---

# Test Workflow

This is a test workflow.`,
			expectedRunsOn: "runs-on: windows-latest",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Create temporary directory and file
			tmpDir := testutil.TempDir(t, "workflow-runs-on-test")

			testFile := filepath.Join(tmpDir, "test.md")
			var err error
			err = os.WriteFile(testFile, []byte(tt.frontmatter), 0644)
			if err != nil {
				t.Fatal(err)
			}

			compiler := NewCompiler()
			if err := compiler.CompileWorkflow(testFile); err != nil {
				t.Fatalf("Failed to compile workflow: %v", err)
			}

			// Read the compiled lock file
			lockFile := filepath.Join(tmpDir, "test.lock.yml")
			yamlContent, err := os.ReadFile(lockFile)
			if err != nil {
				t.Fatalf("Failed to read lock file: %v", err)
			}

			yamlStr := string(yamlContent)
			if !strings.Contains(yamlStr, tt.expectedRunsOn) {
				t.Errorf("Expected compiled YAML to contain %q, but it didn't.\nYAML content:\n%s", tt.expectedRunsOn, yamlStr)
			}
		})
	}
}

func TestSafeOutputsRunsOnAppliedToAllJobs(t *testing.T) {
	frontmatter := `---
on: push
safe-outputs:
  create-issue:
    title-prefix: "[ai] "
  add-comment:
  add-labels:
  update-issue:
  runs-on: self-hosted
---

# Test Workflow

This is a test workflow.`

	// Create temporary directory and file
	tmpDir := testutil.TempDir(t, "workflow-runs-on-test")

	testFile := filepath.Join(tmpDir, "test.md")
	var err error
	err = os.WriteFile(testFile, []byte(frontmatter), 0644)
	if err != nil {
		t.Fatal(err)
	}

	compiler := NewCompiler()
	if err := compiler.CompileWorkflow(testFile); err != nil {
		t.Fatalf("Failed to compile workflow: %v", err)
	}

	// Read the compiled lock file
	lockFile := filepath.Join(tmpDir, "test.lock.yml")
	yamlContent, err := os.ReadFile(lockFile)
	if err != nil {
		t.Fatalf("Failed to read lock file: %v", err)
	}

	yamlStr := string(yamlContent)

	// Check that all safe-outputs jobs use the custom runs-on
	expectedRunsOn := "runs-on: self-hosted"

	// Count occurrences - should appear for safe-outputs jobs + activation/membership jobs
	count := strings.Count(yamlStr, expectedRunsOn)
	if count < 1 { // At least one job should use the custom runner
		t.Errorf("Expected at least 1 occurrence of %q in compiled YAML, found %d.\nYAML content:\n%s", expectedRunsOn, count, yamlStr)
	}

	// Check specifically that the expected safe-outputs jobs use the custom runner
	// Use a pattern that matches YAML job definitions at the correct indentation level
	// to avoid matching JavaScript object properties inside bundled scripts
	expectedJobs := []string{"safe_outputs:"}
	for _, jobName := range expectedJobs {
		// Look for the job name at YAML indentation level (2 spaces under 'jobs:')
		yamlJobPattern := "\n  " + jobName
		jobStart := strings.Index(yamlStr, yamlJobPattern)
		if jobStart != -1 {
			// Look for runs-on within the next 500 characters of this job
			jobSection := yamlStr[jobStart : jobStart+500]
			defaultRunsOn := "runs-on: " + constants.DefaultActivationJobRunnerImage
			if strings.Contains(jobSection, defaultRunsOn) {
				t.Errorf("Job %q still uses default %q instead of custom runner.\nJob section:\n%s", jobName, defaultRunsOn, jobSection)
			}
			if !strings.Contains(jobSection, expectedRunsOn) {
				t.Errorf("Job %q does not use expected %q.\nJob section:\n%s", jobName, expectedRunsOn, jobSection)
			}
		}
	}
}

// TestTopLevelRunsOnInheritedByAllJobs verifies that setting a top-level runs-on
// causes all support jobs (activation, pre_activation, safe_outputs, detection,
// cache-memory, repo-memory) to use the same runner as the agent job.
func TestTopLevelRunsOnInheritedByAllJobs(t *testing.T) {
	frontmatter := `---
on: push
runs-on: self-hosted
safe-outputs:
  create-issue:
    title-prefix: "[ai] "
---

# Test Workflow

This is a test workflow.`

	tmpDir := testutil.TempDir(t, "workflow-top-runs-on-test")
	testFile := filepath.Join(tmpDir, "test.md")
	if err := os.WriteFile(testFile, []byte(frontmatter), 0644); err != nil {
		t.Fatal(err)
	}

	compiler := NewCompiler()
	if err := compiler.CompileWorkflow(testFile); err != nil {
		t.Fatalf("Failed to compile workflow: %v", err)
	}

	lockFile := filepath.Join(tmpDir, "test.lock.yml")
	yamlContent, err := os.ReadFile(lockFile)
	if err != nil {
		t.Fatalf("Failed to read lock file: %v", err)
	}

	yamlStr := string(yamlContent)
	expectedRunsOn := "runs-on: self-hosted"
	defaultRunsOn := "runs-on: " + constants.DefaultActivationJobRunnerImage

	// All jobs (agent + all support) should use self-hosted
	if strings.Contains(yamlStr, defaultRunsOn) {
		t.Errorf("Expected no jobs to use default %q when top-level runs-on is set to self-hosted.\nYAML:\n%s", defaultRunsOn, yamlStr)
	}

	// At minimum, verify activation and safe_outputs jobs use self-hosted
	for _, jobName := range []string{"pre_activation:", "activation:", "safe_outputs:"} {
		jobPattern := "\n  " + jobName
		jobStart := strings.Index(yamlStr, jobPattern)
		if jobStart == -1 {
			continue // job may not be present (optional)
		}
		end := min(jobStart+600, len(yamlStr))
		jobSection := yamlStr[jobStart:end]
		if !strings.Contains(jobSection, expectedRunsOn) {
			t.Errorf("Job %q does not use expected %q when top-level runs-on is self-hosted.\nJob section:\n%s", jobName, expectedRunsOn, jobSection)
		}
	}
}

func TestFormatSafeOutputsRunsOnEdgeCases(t *testing.T) {
	compiler := NewCompiler()

	tests := []struct {
		name           string
		data           *WorkflowData
		expectedRunsOn string
	}{
		{
			name:           "nil safe outputs config",
			data:           &WorkflowData{SafeOutputs: nil},
			expectedRunsOn: "runs-on: " + constants.DefaultActivationJobRunnerImage,
		},
		{
			name: "safe outputs config with empty runs-on",
			data: &WorkflowData{
				SafeOutputs: &SafeOutputsConfig{RunsOn: ""},
			},
			expectedRunsOn: "runs-on: " + constants.DefaultActivationJobRunnerImage,
		},
		{
			name: "inherits from top-level runs-on when safe-outputs.runs-on is unset",
			data: &WorkflowData{
				RunsOn:         "runs-on: self-hosted",
				RunsOnExplicit: true,
				SafeOutputs:    nil,
			},
			expectedRunsOn: "runs-on: self-hosted",
		},
		{
			name: "does not inherit top-level runs-on when it is just the default",
			data: &WorkflowData{
				RunsOn:         "runs-on: ubuntu-latest",
				RunsOnExplicit: false, // not explicitly set by user
				SafeOutputs:    nil,
			},
			expectedRunsOn: "runs-on: " + constants.DefaultActivationJobRunnerImage,
		},
		{
			name: "safe-outputs.runs-on overrides top-level runs-on",
			data: &WorkflowData{
				RunsOn:         "runs-on: ubuntu-latest",
				RunsOnExplicit: true,
				SafeOutputs:    &SafeOutputsConfig{RunsOn: "ubuntu-slim"},
			},
			expectedRunsOn: "runs-on: ubuntu-slim",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			runsOn := compiler.formatSafeOutputsRunsOn(tt.data)
			if runsOn != tt.expectedRunsOn {
				t.Errorf("Expected runs-on to be %q, got %q", tt.expectedRunsOn, runsOn)
			}
		})
	}
}
