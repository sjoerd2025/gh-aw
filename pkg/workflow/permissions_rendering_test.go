//go:build !integration

package workflow

import (
	"strings"
	"testing"
)

func TestPermissionsRenderToYAML(t *testing.T) {
	tests := []struct {
		name        string
		permissions *Permissions
		want        string
	}{
		{
			name:        "nil permissions",
			permissions: nil,
			want:        "",
		},
		{
			name:        "read-all shorthand",
			permissions: NewPermissionsReadAll(),
			want:        "permissions: read-all",
		},
		{
			name:        "write-all shorthand",
			permissions: NewPermissionsWriteAll(),
			want:        "permissions: write-all",
		},
		{
			name:        "empty permissions",
			permissions: NewPermissions(),
			want:        "",
		},
		{
			name: "single permission",
			permissions: NewPermissionsFromMap(map[PermissionScope]PermissionLevel{
				PermissionContents: PermissionRead,
			}),
			want: "permissions:\n      contents: read",
		},
		{
			name: "multiple permissions - sorted",
			permissions: NewPermissionsFromMap(map[PermissionScope]PermissionLevel{
				PermissionIssues:       PermissionWrite,
				PermissionContents:     PermissionRead,
				PermissionPullRequests: PermissionWrite,
			}),
			want: "permissions:\n      contents: read\n      issues: write\n      pull-requests: write",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := tt.permissions.RenderToYAML()
			if got != tt.want {
				t.Errorf("RenderToYAML() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestPermissions_MetadataExcluded(t *testing.T) {
	tests := []struct {
		name        string
		perms       *Permissions
		contains    []string
		notContains []string
	}{
		{
			name: "metadata permission should be excluded from YAML output",
			perms: NewPermissionsFromMap(map[PermissionScope]PermissionLevel{
				PermissionContents: PermissionRead,
				PermissionMetadata: PermissionRead,
				PermissionIssues:   PermissionWrite,
			}),
			contains: []string{
				"permissions:",
				"      contents: read",
				"      issues: write",
			},
			notContains: []string{
				"metadata",
			},
		},
		{
			name:  "read-all shorthand does not expand to include metadata",
			perms: NewPermissionsReadAll(),
			contains: []string{
				"permissions: read-all",
			},
			notContains: []string{
				"metadata",
			},
		},
		{
			name: "metadata: write should also be excluded",
			perms: NewPermissionsFromMap(map[PermissionScope]PermissionLevel{
				PermissionContents: PermissionRead,
				PermissionMetadata: PermissionWrite,
			}),
			contains: []string{
				"permissions:",
				"      contents: read",
			},
			notContains: []string{
				"metadata",
			},
		},
		{
			name: "only metadata permission should render empty permissions",
			perms: NewPermissionsFromMap(map[PermissionScope]PermissionLevel{
				PermissionMetadata: PermissionRead,
			}),
			contains:    []string{},
			notContains: []string{"metadata"},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := tt.perms.RenderToYAML()
			for _, expected := range tt.contains {
				if !strings.Contains(result, expected) {
					t.Errorf("RenderToYAML() should contain %q, but got:\n%s", expected, result)
				}
			}
			for _, notExpected := range tt.notContains {
				if strings.Contains(result, notExpected) {
					t.Errorf("RenderToYAML() should NOT contain %q, but got:\n%s", notExpected, result)
				}
			}
		})
	}
}
