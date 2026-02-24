import type { PermissionScope, PermissionLevel } from '../types/workflow';

interface PermissionRequirement {
  scope: PermissionScope;
  level: PermissionLevel;
}

// Tool → required permissions
const toolPermissions: Record<string, PermissionRequirement[]> = {
  'github': [{ scope: 'contents', level: 'read' }],
  'edit': [{ scope: 'contents', level: 'write' }],
};

// Safe output → required permissions
const safeOutputPermissions: Record<string, PermissionRequirement[]> = {
  'create-issue': [{ scope: 'issues', level: 'write' }],
  'add-comment': [{ scope: 'issues', level: 'write' }],
  'close-issue': [{ scope: 'issues', level: 'write' }],
  'update-issue': [{ scope: 'issues', level: 'write' }],
  'add-labels': [{ scope: 'issues', level: 'write' }],
  'remove-labels': [{ scope: 'issues', level: 'write' }],
  'assign-to-user': [{ scope: 'issues', level: 'write' }],
  'assign-to-agent': [{ scope: 'issues', level: 'write' }],
  'unassign-from-user': [{ scope: 'issues', level: 'write' }],
  'assign-milestone': [{ scope: 'issues', level: 'write' }],
  'link-sub-issue': [{ scope: 'issues', level: 'write' }],
  'create-pull-request': [{ scope: 'pull-requests', level: 'write' }, { scope: 'contents', level: 'write' }],
  'close-pull-request': [{ scope: 'pull-requests', level: 'write' }],
  'update-pull-request': [{ scope: 'pull-requests', level: 'write' }],
  'submit-pull-request-review': [{ scope: 'pull-requests', level: 'write' }],
  'create-pull-request-review-comment': [{ scope: 'pull-requests', level: 'write' }],
  'reply-to-pull-request-review-comment': [{ scope: 'pull-requests', level: 'write' }],
  'resolve-pull-request-review-thread': [{ scope: 'pull-requests', level: 'write' }],
  'push-to-pull-request-branch': [{ scope: 'contents', level: 'write' }],
  'mark-pull-request-as-ready-for-review': [{ scope: 'pull-requests', level: 'write' }],
  'add-reviewer': [{ scope: 'pull-requests', level: 'write' }],
  'create-discussion': [{ scope: 'discussions', level: 'write' }],
  'close-discussion': [{ scope: 'discussions', level: 'write' }],
  'update-discussion': [{ scope: 'discussions', level: 'write' }],
  'create-code-scanning-alert': [{ scope: 'security-events', level: 'write' }],
  'autofix-code-scanning-alert': [{ scope: 'security-events', level: 'write' }],
  'dispatch-workflow': [{ scope: 'actions', level: 'write' }],
  'update-release': [{ scope: 'contents', level: 'write' }],
  'upload-asset': [{ scope: 'contents', level: 'write' }],
  'hide-comment': [{ scope: 'issues', level: 'write' }],
  'update-project': [{ scope: 'issues', level: 'write' }],
  'create-project': [{ scope: 'issues', level: 'write' }],
  'create-project-status-update': [{ scope: 'issues', level: 'write' }],
};

// Engine → required permissions
const enginePermissions: Record<string, PermissionRequirement[]> = {
  'copilot': [{ scope: 'models', level: 'read' }],
};

export function computeRequiredPermissions(
  tools: string[],
  safeOutputs: Record<string, { enabled: boolean }>,
  engineType: string
): Record<PermissionScope, PermissionLevel> {
  const result: Partial<Record<PermissionScope, PermissionLevel>> = {};

  const apply = (reqs: PermissionRequirement[]) => {
    for (const { scope, level } of reqs) {
      const current = result[scope];
      if (!current || (level === 'write' && current === 'read')) {
        result[scope] = level;
      }
    }
  };

  // Tool requirements
  for (const tool of tools) {
    const reqs = toolPermissions[tool];
    if (reqs) apply(reqs);
  }

  // Safe output requirements
  for (const [key, cfg] of Object.entries(safeOutputs)) {
    if (cfg.enabled) {
      const reqs = safeOutputPermissions[key];
      if (reqs) apply(reqs);
    }
  }

  // Engine requirements
  const engineReqs = enginePermissions[engineType];
  if (engineReqs) apply(engineReqs);

  return result as Record<PermissionScope, PermissionLevel>;
}
