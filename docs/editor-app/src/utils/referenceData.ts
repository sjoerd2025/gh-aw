/**
 * Structured reference documentation for all frontmatter fields.
 * Used by the DocsPanel to render a searchable reference sidebar
 * and by the hover tooltip on frontmatter keys.
 */

export interface RefEntry {
  key: string;
  title: string;
  description: string;
  type: string;
  required: boolean;
  examples: string[];
  link: string;
  children?: RefEntry[];
}

export interface RefSection {
  id: string;
  title: string;
  entries: RefEntry[];
}

const BASE = 'https://github.github.com/gh-aw/reference';

// ── Individual entries ──

const nameEntry: RefEntry = {
  key: 'name',
  title: 'Workflow Name',
  description: 'A short name for the workflow. Shown in the GitHub Actions UI. Defaults to the filename if omitted.',
  type: 'string',
  required: false,
  examples: ['name: triage-issues'],
  link: `${BASE}/frontmatter/`,
};

const descriptionEntry: RefEntry = {
  key: 'description',
  title: 'Description',
  description: 'Human-readable description of what the workflow does. Rendered as a comment in the compiled lock file.',
  type: 'string',
  required: false,
  examples: ['description: Automatically triage new issues using AI'],
  link: `${BASE}/frontmatter/`,
};

const sourceEntry: RefEntry = {
  key: 'source',
  title: 'Source',
  description: 'Reference to a remote workflow source in owner/repo/path@ref format. Used for importing workflows from other repositories.',
  type: 'string',
  required: false,
  examples: ['source: acme/workflows/.github/aw/triage.md@main'],
  link: `${BASE}/frontmatter/`,
};

const labelsEntry: RefEntry = {
  key: 'labels',
  title: 'Labels',
  description: 'Array of string labels for categorizing the workflow. Useful for organizing and filtering workflows.',
  type: 'string[]',
  required: false,
  examples: [
    'labels:\n  - triage\n  - issues',
  ],
  link: `${BASE}/frontmatter/`,
};

const importsEntry: RefEntry = {
  key: 'imports',
  title: 'Imports',
  description: 'Array of shared workflow specs to import. Shared components live in .github/workflows/shared/ and provide reusable instructions.',
  type: 'string[]',
  required: false,
  examples: [
    'imports:\n  - shared/common-tools.md\n  - shared/review-guidelines.md',
  ],
  link: `${BASE}/frontmatter/`,
};

const onEntry: RefEntry = {
  key: 'on',
  title: 'Trigger Events',
  description: 'Defines which GitHub events start this workflow. Supports issues, pull_request, issue_comment, discussion, schedule, slash_command, push, workflow_dispatch, and release.',
  type: 'string | string[] | object',
  required: true,
  examples: [
    'on: issues',
    'on:\n  - issues\n  - pull_request',
    'on:\n  issues:\n    types: [opened, labeled]\n  schedule:\n    - cron: "0 9 * * 1"',
  ],
  link: `${BASE}/triggers/`,
  children: [
    {
      key: 'on.reaction',
      title: 'Status Reaction',
      description: 'Emoji reaction the bot adds to the triggering event to show it received the trigger and is working.',
      type: 'string',
      required: false,
      examples: ['on:\n  reaction: eyes'],
      link: `${BASE}/triggers/`,
    },
    {
      key: 'on.manual-approval',
      title: 'Manual Approval',
      description: 'Require a team member to approve before the workflow runs. Good for sensitive operations.',
      type: 'boolean',
      required: false,
      examples: ['on:\n  manual-approval: true'],
      link: `${BASE}/triggers/`,
    },
    {
      key: 'on.roles',
      title: 'Allowed Roles',
      description: 'Only allow users with these repository access levels to trigger the workflow.',
      type: 'string[]',
      required: false,
      examples: ['on:\n  roles:\n    - admin\n    - maintain'],
      link: `${BASE}/triggers/`,
    },
    {
      key: 'on.skip-roles',
      title: 'Skip Roles',
      description: 'Skip the workflow when triggered by users with these repository roles.',
      type: 'string[]',
      required: false,
      examples: ['on:\n  skip-roles:\n    - read'],
      link: `${BASE}/triggers/`,
    },
    {
      key: 'on.skip-bots',
      title: 'Skip Bots',
      description: 'Skip the workflow when triggered by specific bot accounts.',
      type: 'string[] | boolean',
      required: false,
      examples: ['on:\n  skip-bots: true', 'on:\n  skip-bots:\n    - dependabot[bot]'],
      link: `${BASE}/triggers/`,
    },
    {
      key: 'on.bots',
      title: 'Allow Bots',
      description: 'Allow specific bot accounts to trigger the workflow.',
      type: 'string[]',
      required: false,
      examples: ['on:\n  bots:\n    - renovate[bot]'],
      link: `${BASE}/triggers/`,
    },
  ],
};

const engineEntry: RefEntry = {
  key: 'engine',
  title: 'AI Engine',
  description: 'Which AI model powers this workflow. Choose from copilot, claude, or codex. Each engine has different strengths.',
  type: 'string | object',
  required: true,
  examples: [
    'engine: copilot',
    'engine:\n  id: claude\n  model: sonnet',
  ],
  link: `${BASE}/engines/`,
  children: [
    {
      key: 'engine.id',
      title: 'Engine ID',
      description: 'Identifier of the AI engine: copilot, claude, or codex.',
      type: 'string',
      required: true,
      examples: ['engine:\n  id: claude'],
      link: `${BASE}/engines/`,
    },
    {
      key: 'engine.model',
      title: 'Model Version',
      description: 'Specific model version to use. Options depend on the engine (e.g. sonnet, opus for Claude).',
      type: 'string',
      required: false,
      examples: ['engine:\n  id: claude\n  model: sonnet'],
      link: `${BASE}/engines/`,
    },
    {
      key: 'engine.version',
      title: 'Engine Version',
      description: 'Pin a specific version of the engine runtime.',
      type: 'string',
      required: false,
      examples: ['engine:\n  id: copilot\n  version: "1.0.0"'],
      link: `${BASE}/engines/`,
    },
    {
      key: 'engine.command',
      title: 'Custom Command',
      description: 'Path to a custom executable for the engine. Used with custom engine configurations.',
      type: 'string',
      required: false,
      examples: ['engine:\n  command: /usr/local/bin/my-agent'],
      link: `${BASE}/engines/`,
    },
    {
      key: 'engine.args',
      title: 'Custom Arguments',
      description: 'CLI arguments to pass to the custom engine command.',
      type: 'string[]',
      required: false,
      examples: ['engine:\n  command: my-agent\n  args:\n    - --verbose\n    - --timeout=300'],
      link: `${BASE}/engines/`,
    },
  ],
};

const permissionsEntry: RefEntry = {
  key: 'permissions',
  title: 'Permissions',
  description: 'GitHub Actions permissions controlling what the AI can access. Use read-all or write-all for broad access, or set per-scope permissions.',
  type: 'string | object',
  required: false,
  examples: [
    'permissions: read-all',
    'permissions:\n  contents: read\n  issues: write\n  pull-requests: write',
  ],
  link: `${BASE}/permissions/`,
};

const toolsEntry: RefEntry = {
  key: 'tools',
  title: 'Tools',
  description: 'Capabilities and tools available to the AI agent. Each tool extends what the agent can do.',
  type: 'string[] | object[]',
  required: false,
  examples: [
    'tools:\n  - github\n  - bash\n  - playwright',
    'tools:\n  - github:\n      read-only: true\n  - bash:\n      allowed-commands: npm,node',
  ],
  link: `${BASE}/tools/`,
  children: [
    {
      key: 'github',
      title: 'GitHub Tool',
      description: 'Read and interact with your repository: issues, PRs, files, commits, and more via the GitHub MCP server.',
      type: 'object',
      required: false,
      examples: ['tools:\n  - github:\n      read-only: true\n      toolsets: code-review'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'bash',
      title: 'Bash Tool',
      description: 'Run shell commands on the runner. Can be restricted to specific allowed commands.',
      type: 'object',
      required: false,
      examples: ['tools:\n  - bash:\n      allowed-commands: npm,node,git'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'edit',
      title: 'File Editor Tool',
      description: 'Read, create, and modify files in the repository checkout.',
      type: 'boolean',
      required: false,
      examples: ['tools:\n  - edit'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'playwright',
      title: 'Playwright Tool',
      description: 'Browse websites, take screenshots, and interact with web pages using a headless browser.',
      type: 'object',
      required: false,
      examples: ['tools:\n  - playwright:\n      allowed_domains: example.com'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'web-fetch',
      title: 'Web Fetch Tool',
      description: 'Download content from websites and APIs via HTTP requests.',
      type: 'boolean',
      required: false,
      examples: ['tools:\n  - web-fetch'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'web-search',
      title: 'Web Search Tool',
      description: 'Search the internet for information.',
      type: 'boolean',
      required: false,
      examples: ['tools:\n  - web-search'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'cache-memory',
      title: 'Cache Memory Tool',
      description: 'Persist and recall information across workflow runs using GitHub Actions cache.',
      type: 'object',
      required: false,
      examples: ['tools:\n  - cache-memory:\n      key: my-cache\n      retention-days: 30'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'repo-memory',
      title: 'Repo Memory Tool',
      description: 'Store and recall information in a dedicated git branch in the repository.',
      type: 'object',
      required: false,
      examples: ['tools:\n  - repo-memory:\n      branch-prefix: memory/'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'serena',
      title: 'Serena Tool',
      description: 'Advanced code intelligence with language-aware understanding. Provides semantic code analysis.',
      type: 'object',
      required: false,
      examples: ['tools:\n  - serena:\n      languages: typescript,python'],
      link: `${BASE}/tools/`,
    },
    {
      key: 'agentic-workflows',
      title: 'Agentic Workflows Tool',
      description: 'Inspect and analyze other agentic workflows in the repository.',
      type: 'boolean',
      required: false,
      examples: ['tools:\n  - agentic-workflows'],
      link: `${BASE}/tools/`,
    },
  ],
};

const safeOutputsEntry: RefEntry = {
  key: 'safe-outputs',
  title: 'Safe Outputs',
  description: 'Actions the AI agent is allowed to take on your behalf. The agent can only perform explicitly enabled outputs.',
  type: 'string[]',
  required: false,
  examples: [
    'safe-outputs:\n  - add-comment\n  - create-issue\n  - add-labels',
    'safe-outputs:\n  - create-pull-request\n  - push-to-pull-request-branch\n  - submit-pull-request-review',
  ],
  link: `${BASE}/safe-outputs/`,
  children: [
    {
      key: 'add-comment',
      title: 'Add Comment',
      description: 'Post comments on issues and pull requests.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - add-comment'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'create-issue',
      title: 'Create Issue',
      description: 'Open new issues in the repository.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - create-issue'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'create-pull-request',
      title: 'Create Pull Request',
      description: 'Create pull requests with code changes.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - create-pull-request'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'add-labels',
      title: 'Add Labels',
      description: 'Tag issues or PRs with labels.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - add-labels'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'remove-labels',
      title: 'Remove Labels',
      description: 'Remove labels from issues or PRs.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - remove-labels'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'close-issue',
      title: 'Close Issue',
      description: 'Close issues when they are resolved.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - close-issue'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'update-issue',
      title: 'Update Issue',
      description: 'Modify existing issue titles, descriptions, and metadata.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - update-issue'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'close-pull-request',
      title: 'Close Pull Request',
      description: 'Close pull requests.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - close-pull-request'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'update-pull-request',
      title: 'Update Pull Request',
      description: 'Modify existing PR titles, descriptions, and metadata.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - update-pull-request'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'push-to-pull-request-branch',
      title: 'Push to PR Branch',
      description: 'Push commits directly to a PR branch.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - push-to-pull-request-branch'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'submit-pull-request-review',
      title: 'Submit PR Review',
      description: 'Approve or request changes on pull requests.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - submit-pull-request-review'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'create-pull-request-review-comment',
      title: 'Review Code',
      description: 'Add comments on specific lines of code in PRs.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - create-pull-request-review-comment'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'reply-to-pull-request-review-comment',
      title: 'Reply to Reviews',
      description: 'Respond to existing code review comments.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - reply-to-pull-request-review-comment'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'resolve-pull-request-review-thread',
      title: 'Resolve Review Threads',
      description: 'Mark review discussions as resolved.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - resolve-pull-request-review-thread'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'mark-pull-request-as-ready-for-review',
      title: 'Mark PR Ready',
      description: 'Mark draft PRs as ready for review.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - mark-pull-request-as-ready-for-review'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'add-reviewer',
      title: 'Request Reviewers',
      description: 'Assign reviewers to pull requests.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - add-reviewer'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'assign-to-user',
      title: 'Assign to Person',
      description: 'Assign issues or PRs to specific people.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - assign-to-user'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'assign-to-agent',
      title: 'Assign to Copilot',
      description: 'Assign issues to GitHub Copilot for handling.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - assign-to-agent'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'create-discussion',
      title: 'Create Discussion',
      description: 'Start new discussions.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - create-discussion'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'close-discussion',
      title: 'Close Discussion',
      description: 'Close discussions.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - close-discussion'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'dispatch-workflow',
      title: 'Trigger Other Workflows',
      description: 'Start other workflows in the repository.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - dispatch-workflow'],
      link: `${BASE}/safe-outputs/`,
    },
    {
      key: 'upload-asset',
      title: 'Upload Files',
      description: 'Upload images, charts, or reports for persistent storage.',
      type: 'boolean', required: false,
      examples: ['safe-outputs:\n  - upload-asset'],
      link: `${BASE}/safe-outputs/`,
    },
  ],
};

const networkEntry: RefEntry = {
  key: 'network',
  title: 'Network',
  description: 'Control which domains the agent can access. By default only essential services (GitHub, AI providers) are allowed.',
  type: 'object',
  required: false,
  examples: [
    'network:\n  allowed:\n    - api.example.com\n    - "*.npmjs.org"',
    'network:\n  blocked:\n    - evil.com',
  ],
  link: `${BASE}/network/`,
  children: [
    {
      key: 'network.allowed',
      title: 'Allowed Domains',
      description: 'Additional domains the agent is allowed to connect to beyond the defaults.',
      type: 'string[]', required: false,
      examples: ['network:\n  allowed:\n    - api.example.com\n    - pypi.org'],
      link: `${BASE}/network/`,
    },
    {
      key: 'network.blocked',
      title: 'Blocked Domains',
      description: 'Domains to explicitly block, even if they would otherwise be allowed.',
      type: 'string[]', required: false,
      examples: ['network:\n  blocked:\n    - evil.com'],
      link: `${BASE}/network/`,
    },
  ],
};

const timeoutEntry: RefEntry = {
  key: 'timeout-minutes',
  title: 'Timeout',
  description: 'Maximum time in minutes the workflow is allowed to run before it stops automatically.',
  type: 'number',
  required: false,
  examples: ['timeout-minutes: 30'],
  link: `${BASE}/frontmatter/`,
};

const strictEntry: RefEntry = {
  key: 'strict',
  title: 'Strict Mode',
  description: 'Enable enhanced security validation for the workflow. Adds extra checks during compilation.',
  type: 'boolean',
  required: false,
  examples: ['strict: true'],
  link: `${BASE}/frontmatter/`,
};

const concurrencyEntry: RefEntry = {
  key: 'concurrency',
  title: 'Concurrency',
  description: 'Control what happens when this workflow is triggered while already running. Define a group and whether to cancel in-progress runs.',
  type: 'object',
  required: false,
  examples: [
    'concurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}\n  cancel-in-progress: true',
  ],
  link: `${BASE}/frontmatter/`,
  children: [
    {
      key: 'concurrency.group',
      title: 'Concurrency Group',
      description: 'An expression that groups workflow runs. Only one run per group can be active at a time.',
      type: 'string', required: true,
      examples: ['concurrency:\n  group: ${{ github.workflow }}-${{ github.ref }}'],
      link: `${BASE}/frontmatter/`,
    },
    {
      key: 'concurrency.cancel-in-progress',
      title: 'Cancel In-Progress',
      description: 'Cancel any running workflow in the same group when a new one starts.',
      type: 'boolean', required: false,
      examples: ['concurrency:\n  group: my-group\n  cancel-in-progress: true'],
      link: `${BASE}/frontmatter/`,
    },
  ],
};

const runtimesEntry: RefEntry = {
  key: 'runtimes',
  title: 'Runtimes',
  description: 'Override default runtime versions for languages used during the workflow (node, python, go, etc.).',
  type: 'object',
  required: false,
  examples: [
    'runtimes:\n  node: "20"\n  python: "3.12"',
  ],
  link: `${BASE}/frontmatter/`,
};

const featuresEntry: RefEntry = {
  key: 'features',
  title: 'Features',
  description: 'Feature flags to enable experimental or optional functionality in the workflow.',
  type: 'object',
  required: false,
  examples: ['features:\n  mcp-gateway: true'],
  link: `${BASE}/frontmatter/`,
};

// ── Organized into sections ──

export const referenceSections: RefSection[] = [
  {
    id: 'general',
    title: 'General',
    entries: [nameEntry, descriptionEntry, sourceEntry, labelsEntry, importsEntry],
  },
  {
    id: 'triggers',
    title: 'Triggers',
    entries: [onEntry],
  },
  {
    id: 'engines',
    title: 'Engine',
    entries: [engineEntry],
  },
  {
    id: 'permissions',
    title: 'Permissions',
    entries: [permissionsEntry],
  },
  {
    id: 'tools',
    title: 'Tools',
    entries: [toolsEntry],
  },
  {
    id: 'safe-outputs',
    title: 'Safe Outputs',
    entries: [safeOutputsEntry],
  },
  {
    id: 'network',
    title: 'Network',
    entries: [networkEntry],
  },
  {
    id: 'settings',
    title: 'Settings',
    entries: [timeoutEntry, strictEntry, concurrencyEntry, runtimesEntry, featuresEntry],
  },
];

/** Flat lookup: key -> RefEntry (includes children). */
const entryMap = new Map<string, RefEntry>();

function indexEntries(entries: RefEntry[]) {
  for (const entry of entries) {
    entryMap.set(entry.key, entry);
    if (entry.children) indexEntries(entry.children);
  }
}
for (const section of referenceSections) {
  indexEntries(section.entries);
}

/** Look up a RefEntry by frontmatter key. */
export function getRefEntry(key: string): RefEntry | undefined {
  return entryMap.get(key);
}

/** Find which section a key belongs to. */
export function getSectionForKey(key: string): RefSection | undefined {
  // Check top-level key (strip child prefix)
  const topKey = key.includes('.') ? key.split('.')[0] : key;
  for (const section of referenceSections) {
    for (const entry of section.entries) {
      if (entry.key === topKey || entry.key === key) return section;
      if (entry.children?.some(c => c.key === key)) return section;
    }
  }
  return undefined;
}
