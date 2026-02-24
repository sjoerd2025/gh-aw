/**
 * Plain English descriptions for all workflow fields.
 * Sourced from USER-JOURNEYS.md field translations.
 */

export interface FieldDescription {
  label: string;
  description: string;
  tooltip?: string;
}

export const fieldDescriptions: Record<string, FieldDescription> = {
  // Top-level fields
  name: {
    label: 'Workflow Name',
    description: 'A short name for your workflow that shows up in GitHub.',
  },
  description: {
    label: 'Description',
    description: 'An optional note describing what this workflow does.',
  },
  on: {
    label: 'When to Run',
    description: 'What event in your repository should start this workflow.',
    tooltip: 'Events in your GitHub repository that will start this workflow automatically.',
  },
  engine: {
    label: 'AI Assistant',
    description: 'Which AI model powers this workflow.',
    tooltip: 'The AI model that reads your instructions and takes action. Different models have different strengths.',
  },
  permissions: {
    label: 'What the Agent Can Access',
    description: 'What parts of your repository the AI is allowed to read or change.',
    tooltip: 'Controls what parts of your repository the AI can see and change. Start with read-only and add write access only if needed.',
  },
  tools: {
    label: 'Tools & Capabilities',
    description: 'What tools the AI agent can use to get work done.',
    tooltip: 'Capabilities you give to the AI. For example, "GitHub" lets it read your code, and "Web Browser" lets it visit websites.',
  },
  'safe-outputs': {
    label: 'Actions the Agent Can Take',
    description: 'What the AI is allowed to create or modify on your behalf.',
    tooltip: 'These are the actions the AI is allowed to take. It can only do what you enable here.',
  },
  network: {
    label: 'Internet Access',
    description: 'Which websites and services the agent is allowed to connect to.',
    tooltip: 'Which websites the AI can connect to. By default, only essential services are allowed.',
  },
  instructions: {
    label: 'Instructions',
    description: 'Tell the AI what to do in plain English.',
    tooltip: 'Write what you want the AI to do in plain English. Be specific about what to look for and how to respond.',
  },
  'timeout-minutes': {
    label: 'Time Limit',
    description: 'Maximum time the workflow is allowed to run before it stops automatically.',
    tooltip: 'The workflow stops automatically after this many minutes, even if it\'s not done.',
  },
  concurrency: {
    label: 'Overlap Handling',
    description: 'What happens if this workflow is triggered again while already running.',
    tooltip: 'What happens if this workflow triggers again while it\'s already running.',
  },
  'concurrency.group': {
    label: 'Concurrency Group',
    description: 'An expression that groups workflow runs. Only one run per group can be active.',
    tooltip: 'Runs with the same group key are queued. Common pattern: use the workflow name + branch.',
  },
  'concurrency.cancelInProgress': {
    label: 'Cancel In-Progress',
    description: 'Cancel any running workflow in the same group when a new one starts.',
  },
  'rateLimit': {
    label: 'Rate Limit',
    description: 'Limit how often this workflow can run.',
    tooltip: 'Prevents the workflow from running too frequently within a time window.',
  },
  'rateLimit.max': {
    label: 'Maximum Runs',
    description: 'Maximum number of runs allowed in the time window.',
  },
  'rateLimit.window': {
    label: 'Time Window',
    description: 'Duration of the rate limit window (e.g. 1h, 24h, 7d).',
  },
  platform: {
    label: 'Runner Platform',
    description: 'Which GitHub Actions runner to use for this workflow.',
    tooltip: 'The operating system and version for the runner machine.',
  },
  settings: {
    label: 'Settings',
    description: 'Configure advanced workflow behavior like concurrency, rate limits, and platform.',
  },
  imports: {
    label: 'Include Shared Instructions',
    description: 'Pull in reusable instruction snippets from shared files.',
  },
  strict: {
    label: 'Strict Mode',
    description: 'Enable extra security validation for the workflow.',
  },

  // Trigger events
  'trigger.push': {
    label: 'Code is pushed',
    description: 'Someone pushes code changes to a branch.',
  },
  'trigger.pull_request': {
    label: 'Pull request activity',
    description: 'Someone creates, updates, or closes a pull request.',
  },
  'trigger.issues': {
    label: 'Issue activity',
    description: 'Someone creates, edits, closes, or reopens an issue.',
  },
  'trigger.issue_comment': {
    label: 'New comment',
    description: 'Someone adds or edits a comment on an issue or PR.',
  },
  'trigger.discussion': {
    label: 'Discussion activity',
    description: 'Someone creates or updates a discussion.',
  },
  'trigger.schedule': {
    label: 'On a schedule',
    description: 'Runs automatically at specific times.',
  },
  'trigger.workflow_dispatch': {
    label: 'Manual trigger',
    description: 'Someone clicks "Run workflow" in GitHub.',
  },
  'trigger.slash_command': {
    label: 'Slash command',
    description: 'Someone types a command like /review in a comment.',
  },
  'trigger.release': {
    label: 'New release',
    description: 'A new release is published or updated.',
  },

  // Trigger modifiers
  'trigger.reaction': {
    label: 'Status Reaction',
    description: 'Emoji reaction the bot adds to show it\'s working.',
    tooltip: 'An emoji the bot adds to show it received the trigger and is working on it.',
  },
  'trigger.statusComment': {
    label: 'Status Comments',
    description: 'Whether to post "started" and "completed" messages.',
    tooltip: 'Posts a comment when the workflow starts and finishes, so you know what\'s happening.',
  },
  'trigger.skipBots': {
    label: 'Skip for bots',
    description: 'Don\'t run when triggered by bot accounts.',
  },
  'trigger.skipRoles': {
    label: 'Skip for roles',
    description: 'Don\'t run when triggered by users with these repository roles.',
  },
  'trigger.roles': {
    label: 'Required roles',
    description: 'Only allow users with these repository access levels to trigger the workflow.',
    tooltip: 'Only users with these repository access levels can trigger the workflow.',
  },
  'trigger.manualApproval': {
    label: 'Require approval',
    description: 'Someone must approve before the workflow runs.',
    tooltip: 'A team member must approve before the workflow runs. Good for sensitive operations.',
  },

  // Engines
  'engine.copilot': {
    label: 'GitHub Copilot',
    description: 'GitHub\'s built-in AI assistant - great for general coding tasks.',
  },
  'engine.claude': {
    label: 'Claude (Anthropic)',
    description: 'Advanced reasoning AI - best for complex analysis and detailed work.',
  },
  'engine.codex': {
    label: 'OpenAI Codex',
    description: 'OpenAI\'s code-focused AI - good for code generation.',
  },
  'engine.model': {
    label: 'Model Version',
    description: 'Which specific version of the AI to use.',
  },
  'engine.maxTurns': {
    label: 'Maximum Conversations',
    description: 'How many back-and-forth exchanges the AI can have before stopping.',
  },

  // Tools
  'tool.github': {
    label: 'GitHub',
    description: 'Read and interact with your repository (issues, PRs, files, commits).',
  },
  'tool.bash': {
    label: 'Terminal Commands',
    description: 'Run shell commands on the server.',
  },
  'tool.edit': {
    label: 'File Editor',
    description: 'Read, create, and modify files in the repository.',
  },
  'tool.playwright': {
    label: 'Web Browser',
    description: 'Browse websites, take screenshots, and test web pages.',
  },
  'tool.web-fetch': {
    label: 'Web Fetcher',
    description: 'Download content from websites and APIs.',
  },
  'tool.web-search': {
    label: 'Web Search',
    description: 'Search the internet for information.',
  },
  'tool.cache-memory': {
    label: 'Persistent Memory',
    description: 'Remember information across workflow runs.',
  },
  'tool.repo-memory': {
    label: 'Repository Memory',
    description: 'Store and recall information in a dedicated git branch.',
  },
  'tool.serena': {
    label: 'Code Intelligence',
    description: 'Advanced code analysis with language-aware understanding.',
  },
  'tool.agentic-workflows': {
    label: 'Workflow Inspector',
    description: 'Analyze other agentic workflows in the repository.',
  },

  // Permissions
  'permission.contents': {
    label: 'Repository files',
    description: 'Read: can view code and files. Write: can create, edit, and delete files and branches.',
  },
  'permission.issues': {
    label: 'Issues',
    description: 'Read: can view issues. Write: can create, edit, close, and label issues.',
  },
  'permission.pull-requests': {
    label: 'Pull requests',
    description: 'Read: can view pull requests. Write: can create, edit, and close pull requests.',
  },
  'permission.discussions': {
    label: 'Discussions',
    description: 'Read: can view discussions. Write: can create, edit, and close discussions.',
  },
  'permission.actions': {
    label: 'Workflow runs',
    description: 'Read: can view workflow history. Write: can manage and re-run workflows.',
  },
  'permission.checks': {
    label: 'Status checks',
    description: 'Read: can view CI/CD results. Write: can create and update check results.',
  },
  'permission.security-events': {
    label: 'Security alerts',
    description: 'Read: can view security alerts. Write: can create and dismiss alerts.',
  },
  'permission.models': {
    label: 'AI models',
    description: 'Read: can use GitHub Copilot AI models.',
  },
  'permission.id-token': {
    label: 'Identity token',
    description: 'Write: can request an OIDC identity token.',
  },

  // Safe outputs
  'safeOutput.create-issue': {
    label: 'Create Issues',
    description: 'The agent can open new issues in your repository.',
  },
  'safeOutput.add-comment': {
    label: 'Add Comments',
    description: 'The agent can post comments on issues and pull requests.',
  },
  'safeOutput.create-pull-request': {
    label: 'Create Pull Requests',
    description: 'The agent can create pull requests with code changes.',
  },
  'safeOutput.add-labels': {
    label: 'Add Labels',
    description: 'The agent can tag issues or PRs with labels.',
  },
  'safeOutput.remove-labels': {
    label: 'Remove Labels',
    description: 'The agent can remove labels from issues or PRs.',
  },
  'safeOutput.close-issue': {
    label: 'Close Issues',
    description: 'The agent can close issues when they\'re resolved.',
  },
  'safeOutput.update-issue': {
    label: 'Edit Issues',
    description: 'The agent can modify existing issue titles, descriptions, and metadata.',
  },
  'safeOutput.close-pull-request': {
    label: 'Close Pull Requests',
    description: 'The agent can close pull requests.',
  },
  'safeOutput.update-pull-request': {
    label: 'Edit Pull Requests',
    description: 'The agent can modify existing PR titles, descriptions, and metadata.',
  },
  'safeOutput.create-pull-request-review-comment': {
    label: 'Review Code',
    description: 'The agent can add comments on specific lines of code in PRs.',
  },
  'safeOutput.submit-pull-request-review': {
    label: 'Submit PR Review',
    description: 'The agent can approve or request changes on pull requests.',
  },
  'safeOutput.reply-to-pull-request-review-comment': {
    label: 'Reply to Reviews',
    description: 'The agent can respond to existing code review comments.',
  },
  'safeOutput.resolve-pull-request-review-thread': {
    label: 'Resolve Review Threads',
    description: 'The agent can mark review discussions as resolved.',
  },
  'safeOutput.push-to-pull-request-branch': {
    label: 'Push Code to PR',
    description: 'The agent can push commits directly to a PR branch.',
  },
  'safeOutput.mark-pull-request-as-ready-for-review': {
    label: 'Mark PR Ready',
    description: 'The agent can mark draft PRs as ready for review.',
  },
  'safeOutput.add-reviewer': {
    label: 'Request Reviewers',
    description: 'The agent can assign reviewers to pull requests.',
  },
  'safeOutput.assign-to-user': {
    label: 'Assign to Person',
    description: 'The agent can assign issues or PRs to specific people.',
  },
  'safeOutput.assign-to-agent': {
    label: 'Assign to Copilot',
    description: 'The agent can assign issues to GitHub Copilot for handling.',
  },
  'safeOutput.unassign-from-user': {
    label: 'Unassign Person',
    description: 'The agent can remove assignees from issues or PRs.',
  },
  'safeOutput.assign-milestone': {
    label: 'Set Milestone',
    description: 'The agent can assign milestones to issues or PRs.',
  },
  'safeOutput.link-sub-issue': {
    label: 'Link Sub-Issues',
    description: 'The agent can create parent-child relationships between issues.',
  },
  'safeOutput.create-discussion': {
    label: 'Create Discussions',
    description: 'The agent can start new discussions.',
  },
  'safeOutput.close-discussion': {
    label: 'Close Discussions',
    description: 'The agent can close discussions.',
  },
  'safeOutput.update-discussion': {
    label: 'Edit Discussions',
    description: 'The agent can modify existing discussions.',
  },
  'safeOutput.create-code-scanning-alert': {
    label: 'Report Vulnerabilities',
    description: 'The agent can create security alerts for detected issues.',
  },
  'safeOutput.autofix-code-scanning-alert': {
    label: 'Auto-fix Security Issues',
    description: 'The agent can propose fixes for security alerts.',
  },
  'safeOutput.hide-comment': {
    label: 'Hide Comments',
    description: 'The agent can minimize irrelevant or outdated comments.',
  },
  'safeOutput.dispatch-workflow': {
    label: 'Trigger Other Workflows',
    description: 'The agent can start other workflows in the repository.',
  },
  'safeOutput.upload-asset': {
    label: 'Upload Files',
    description: 'The agent can publish images, charts, or reports for persistent storage.',
  },
  'safeOutput.update-release': {
    label: 'Edit Releases',
    description: 'The agent can modify release notes and assets.',
  },
  'safeOutput.update-project': {
    label: 'Update Projects',
    description: 'The agent can add items and update fields in GitHub Projects.',
  },
  'safeOutput.create-project': {
    label: 'Create Projects',
    description: 'The agent can create new GitHub Projects.',
  },
  'safeOutput.create-project-status-update': {
    label: 'Post Project Updates',
    description: 'The agent can post progress updates to GitHub Projects.',
  },
  'safeOutput.create-agent-task': {
    label: 'Create Agent Tasks',
    description: 'The agent can create tasks for GitHub Copilot.',
  },
  'safeOutput.create-agent-session': {
    label: 'Start Agent Sessions',
    description: 'The agent can start new Copilot coding sessions.',
  },
  'safeOutput.missing-tool': {
    label: 'Report Missing Tools',
    description: 'The agent can report when a required tool isn\'t available.',
  },
  'safeOutput.missing-data': {
    label: 'Report Missing Data',
    description: 'The agent can report when required information is missing.',
  },
  'safeOutput.noop': {
    label: 'No Action Needed',
    description: 'The agent can explicitly say nothing needs to be done.',
  },
  'safeOutput.threat-detection': {
    label: 'Report Threats',
    description: 'The agent can flag security threats or suspicious patterns.',
  },

  // Tool configurations — GitHub
  'toolConfig.github.read-only': {
    label: 'Read-only',
    description: 'Restrict the GitHub tool to read operations only (no writes).',
  },
  'toolConfig.github.lockdown': {
    label: 'Lockdown',
    description: 'Only allow explicitly listed functions. Blocks all others.',
  },
  'toolConfig.github.toolsets': {
    label: 'Toolsets',
    description: 'Comma-separated groups of related functions to enable (e.g. code-review, issue-triage).',
  },
  'toolConfig.github.allowed': {
    label: 'Allowed Functions',
    description: 'Comma-separated list of specific GitHub MCP functions the agent can call.',
  },

  // Tool configurations — Playwright
  'toolConfig.playwright.version': {
    label: 'Version',
    description: 'Pin a specific Playwright version.',
  },
  'toolConfig.playwright.allowed_domains': {
    label: 'Allowed Domains',
    description: 'Restrict which domains the browser can visit. Leave empty for no restriction.',
  },

  // Tool configurations — Cache Memory
  'toolConfig.cache-memory.key': {
    label: 'Cache Key',
    description: 'Unique identifier for this cache. Different keys store separate data.',
  },
  'toolConfig.cache-memory.scope': {
    label: 'Scope',
    description: 'Whether the cache is shared across the whole repo or just this workflow.',
  },
  'toolConfig.cache-memory.retention-days': {
    label: 'Retention (days)',
    description: 'How many days to keep cached data (1-90).',
  },
  'toolConfig.cache-memory.description': {
    label: 'Description',
    description: 'A note describing what this cache stores.',
  },
  'toolConfig.cache-memory.restore-only': {
    label: 'Restore Only',
    description: 'Only read from cache, never write new data.',
  },

  // Tool configurations — Repo Memory
  'toolConfig.repo-memory.branch-prefix': {
    label: 'Branch Prefix',
    description: 'Prefix for the git branch used to store memory files.',
  },
  'toolConfig.repo-memory.target-repo': {
    label: 'Target Repository',
    description: 'Store memory in a different repo (owner/repo format).',
  },
  'toolConfig.repo-memory.branch-name': {
    label: 'Branch Name',
    description: 'Explicit branch name. Auto-generated if left blank.',
  },
  'toolConfig.repo-memory.description': {
    label: 'Description',
    description: 'A note describing what this memory branch stores.',
  },
  'toolConfig.repo-memory.file-glob': {
    label: 'File Patterns',
    description: 'Comma-separated glob patterns for files to include.',
  },
  'toolConfig.repo-memory.max-file-size': {
    label: 'Max File Size',
    description: 'Maximum file size in bytes for stored memory files.',
  },

  // Tool configurations — Serena
  'toolConfig.serena.version': {
    label: 'Version',
    description: 'Pin a specific Serena version.',
  },
  'toolConfig.serena.mode': {
    label: 'Mode',
    description: 'Run Serena in a Docker container or locally on the runner.',
  },
  'toolConfig.serena.languages': {
    label: 'Languages',
    description: 'Which programming languages to enable code intelligence for.',
  },

  // Tool configurations — Bash
  'toolConfig.bash.allowed-commands': {
    label: 'Allowed Commands',
    description: 'Comma-separated list of specific commands to allow (e.g. npm test, make build, gh issue comment).',
  },

  // Network
  'network.defaults': {
    label: 'Standard access only',
    description: 'Only essential services (GitHub, AI providers).',
  },
  'network.allowed': {
    label: 'Allow specific websites',
    description: 'Let the agent access these additional websites.',
  },
  'network.blocked': {
    label: 'Block specific websites',
    description: 'Prevent the agent from accessing these websites.',
  },
};

export function getFieldDescription(key: string): FieldDescription {
  return fieldDescriptions[key] ?? { label: key, description: '' };
}
