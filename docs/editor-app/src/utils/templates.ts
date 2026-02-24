import type { WorkflowTemplate } from '../types/workflow';

const READ_ALL_PERMISSIONS = {
  contents: 'read' as const,
  issues: 'read' as const,
  'pull-requests': 'read' as const,
  actions: 'read' as const,
  checks: 'read' as const,
  'security-events': 'read' as const,
  statuses: 'read' as const,
  metadata: 'read' as const,
};

const NETWORK_DEFAULTS = { allowed: ['defaults'] };

const NETWORK_WITH_ECOSYSTEMS = {
  allowed: ['defaults', 'dotnet', 'node', 'python', 'rust', 'java'],
};

export const templates: WorkflowTemplate[] = [
  // ── Issue & PR ──────────────────────────────────────────────────
  {
    id: 'issue-triage',
    name: 'Issue Triage',
    description:
      'Analyze new issues, apply labels, detect spam, find duplicates, and post triage notes with debugging strategies',
    category: 'Issue & PR',
    icon: 'inbox',
    trigger: {
      event: 'issues',
      activityTypes: ['opened', 'reopened'],
      reaction: 'eyes',
    },
    engine: {},
    permissions: READ_ALL_PERMISSIONS,
    tools: ['web-fetch', 'github'],
    safeOutputs: {
      'add-labels': { max: 5 },
      'add-comment': true,
    },
    network: NETWORK_DEFAULTS,
    instructions: `You are a triage assistant for GitHub issues. When a new issue is opened or reopened:
1. Fetch the issue content. If it is spam or bot-generated, add a one-sentence comment and exit.
2. Gather context: fetch available labels, find similar open issues, and read any comments.
3. Analyze the issue type (bug, feature, question), severity, affected components, and user impact.
4. Apply up to 5 labels that accurately reflect the issue. Only use labels from the repository's label list.
5. Post a triage comment starting with "Agentic Issue Triage" that includes a brief summary, debugging strategies or reproduction steps, relevant resource links, and a checklist of sub-tasks if appropriate. Use collapsed sections to keep the comment tidy.`,
  },
  {
    id: 'pr-fix',
    name: 'PR Fix',
    description:
      'Analyze failing CI checks, identify root causes, implement fixes, and push corrections to the PR branch',
    category: 'Issue & PR',
    icon: 'wrench',
    trigger: {
      event: 'slash_command',
      slashCommandName: 'pr-fix',
      reaction: 'eyes',
    },
    engine: {},
    permissions: READ_ALL_PERMISSIONS,
    tools: ['web-fetch', 'bash'],
    safeOutputs: {
      'push-to-pull-request-branch': true,
      'create-issue': {
        'title-prefix': '[pr-fix] ',
        labels: ['automation', 'pr-fix'],
      },
      'add-comment': true,
    },
    network: NETWORK_DEFAULTS,
    instructions: `You are an AI assistant specialized in fixing pull requests with failing CI checks.
1. Read the pull request, its comments, and any user instructions from the /pr-fix command.
2. Analyze failure logs from failing workflow runs. Identify specific error messages and root causes.
3. Check out the PR branch and set up the development environment.
4. Implement the necessary fixes — modifying code, updating dependencies, or changing configuration.
5. Run tests, formatters, and linters to verify the fix doesn't introduce new problems.
6. Push the changes to the PR branch and add a comment summarizing what was fixed and why.`,
  },
  {
    id: 'ai-moderator',
    name: 'AI Moderator',
    description:
      'Detect spam, link spam, and AI-generated content in issues, comments, and pull requests',
    category: 'Issue & PR',
    icon: 'shield',
    trigger: {
      event: 'issues',
      activityTypes: ['opened'],
    },
    engine: { type: 'codex' },
    permissions: {
      contents: 'read',
      issues: 'read',
      'pull-requests': 'read',
    },
    tools: ['github'],
    safeOutputs: {
      'add-labels': {
        allowed: ['spam', 'ai-generated', 'link-spam', 'ai-inspected'],
      },
      'hide-comment': { max: 5 },
    },
    network: NETWORK_DEFAULTS,
    instructions: `You are an AI-powered moderation system that detects spam, link spam, and AI-generated content.
1. Fetch the original content directly from the GitHub API (do not use pre-sanitized text).
2. Analyze for spam indicators: promotional content, irrelevant links, repetitive text, scams.
3. Analyze for link spam: multiple unrelated links, shortened URLs, suspicious domains.
4. Analyze for AI-generated content: em-dashes in casual contexts, perfect grammar in informal settings, generic enthusiasm without substance.
5. Apply appropriate labels (spam, link-spam, ai-generated) or add ai-inspected if content is legitimate.
6. For comments, hide spam with the hide-comment safe output. Be conservative to avoid false positives.`,
  },
  {
    id: 'contribution-check',
    name: 'Contribution Check',
    description:
      'Evaluate open pull requests against contribution guidelines and compile a quality report',
    category: 'Issue & PR',
    icon: 'clipboard-check',
    trigger: {
      event: 'schedule',
      schedule: '0 */4 * * *',
    },
    engine: {},
    permissions: {
      contents: 'read',
      issues: 'read',
      'pull-requests': 'read',
    },
    tools: ['github'],
    safeOutputs: {
      'create-issue': {
        'title-prefix': '[Contribution Check Report] ',
        labels: ['contribution-report'],
      },
      'add-labels': { allowed: ['spam', 'needs-work', 'outdated', 'lgtm'], max: 4 },
      'add-comment': { max: 10 },
    },
    network: NETWORK_DEFAULTS,
    instructions: `You are a contribution quality orchestrator. Your job is to evaluate open PRs against the repository's contribution guidelines.
1. Read the pre-filtered PR list from pr-filter-results.json if available, otherwise query recent PRs.
2. For each PR, evaluate: Is it on-topic? Is it focused? Does it include tests? Does it follow CONTRIBUTING.md?
3. Classify PRs as Ready to Review, Needs a Closer Look, or Off-Guidelines.
4. Post constructive comments on PRs that need work (skip PRs marked lgtm).
5. Compile a report issue grouping PRs by action needed, with a warm and constructive tone.
6. Apply quality labels (lgtm, needs-work, spam, outdated) to the report issue.`,
  },

  // ── Scheduled ───────────────────────────────────────────────────
  {
    id: 'daily-doc-updater',
    name: 'Daily Doc Updater',
    description:
      'Scan recent merges and commits to update documentation for new features and changes',
    category: 'Scheduled',
    icon: 'book',
    trigger: {
      event: 'schedule',
      schedule: '0 0 * * *',
    },
    engine: {},
    permissions: {
      contents: 'read',
      issues: 'read',
      'pull-requests': 'read',
    },
    tools: ['github', 'edit', 'bash'],
    safeOutputs: {
      'create-pull-request': {
        expires: '2d',
        'title-prefix': '[docs] ',
        labels: ['documentation', 'automation'],
        draft: false,
      },
    },
    network: NETWORK_WITH_ECOSYSTEMS,
    instructions: `You are a documentation maintenance agent that runs daily.
1. Search for pull requests merged in the last 24 hours and review recent commits.
2. Analyze changes for new features added, features removed or modified, and breaking changes.
3. Locate the documentation structure (docs/, README.md, or other markdown files).
4. Update documentation to reflect current behavior — follow the existing style, tone, and formatting.
5. Open a pull request listing the features documented, changes made, and merged PRs referenced.
6. If no recent changes or all features are already documented, exit gracefully.`,
  },
  {
    id: 'daily-test-improver',
    name: 'Daily Test Improver',
    description:
      'Systematically identify testing gaps and implement high-value test improvements',
    category: 'Scheduled',
    icon: 'test-tube',
    trigger: {
      event: 'schedule',
      schedule: '0 0 * * *',
    },
    engine: {},
    permissions: READ_ALL_PERMISSIONS,
    tools: ['web-fetch', 'bash', 'github', 'repo-memory'],
    safeOutputs: {
      'add-comment': { max: 10 },
      'create-pull-request': {
        draft: true,
        'title-prefix': '[Test Improver] ',
        labels: ['automation', 'testing'],
        max: 4,
      },
      'push-to-pull-request-branch': true,
      'create-issue': {
        'title-prefix': '[Test Improver] ',
        labels: ['automation', 'testing'],
        max: 4,
      },
    },
    network: NETWORK_WITH_ECOSYSTEMS,
    instructions: `You are a test improvement agent. Focus on high-value tests, not just coverage numbers.
1. Discover and validate build/test/coverage commands by analyzing CI configs, Makefiles, and package.json.
2. Identify high-value testing opportunities: bug-prone areas, critical paths, untested edge cases, flaky tests.
3. Implement test improvements — new tests for untested code, regression tests, edge case tests, or flaky test fixes.
4. Run all tests to ensure new tests pass and existing tests still work. Measure coverage impact.
5. Create a draft PR with goal, rationale, approach, coverage impact, and trade-offs.
6. Maintain existing Test Improver PRs by fixing CI failures and resolving merge conflicts.`,
  },
  {
    id: 'daily-perf-improver',
    name: 'Daily Perf Improver',
    description:
      'Identify and implement performance improvements with measured before/after impact',
    category: 'Scheduled',
    icon: 'zap',
    trigger: {
      event: 'schedule',
      schedule: '0 0 * * *',
    },
    engine: {},
    permissions: READ_ALL_PERMISSIONS,
    tools: ['web-fetch', 'github', 'bash', 'repo-memory'],
    safeOutputs: {
      'add-comment': { max: 10 },
      'create-pull-request': {
        draft: true,
        'title-prefix': '[Perf Improver] ',
        labels: ['automation', 'performance'],
        max: 4,
      },
      'push-to-pull-request-branch': true,
      'create-issue': {
        'title-prefix': '[Perf Improver] ',
        labels: ['automation', 'performance'],
        max: 4,
      },
    },
    network: NETWORK_WITH_ECOSYSTEMS,
    instructions: `You are a performance improvement agent. Be methodical, evidence-driven, and mindful of trade-offs.
1. Discover and validate build/test/benchmark commands from CI configs and project files.
2. Identify performance opportunities: user-facing bottlenecks, system inefficiencies, build/test slowness, CI duration.
3. Establish baseline measurements, implement the optimization, and measure again with the same methodology.
4. Run tests and formatters. Create a draft PR with goal, approach, before/after measurements, and trade-offs.
5. Maintain existing Perf Improver PRs — fix CI failures, resolve merge conflicts.
6. Update a monthly activity summary issue tracking all performance work and suggested actions.`,
  },
  {
    id: 'daily-repo-status',
    name: 'Daily Repo Status',
    description:
      'Generate daily status reports with activity summaries, progress tracking, and recommendations',
    category: 'Scheduled',
    icon: 'bar-chart',
    trigger: {
      event: 'schedule',
      schedule: '0 0 * * *',
    },
    engine: {},
    permissions: {
      contents: 'read',
      issues: 'read',
      'pull-requests': 'read',
    },
    tools: ['github'],
    safeOutputs: {
      'create-issue': {
        'title-prefix': '[repo-status] ',
        labels: ['report', 'daily-status'],
      },
    },
    network: NETWORK_DEFAULTS,
    instructions: `Create an upbeat daily status report for the repository as a GitHub issue.
1. Gather recent repository activity — issues, PRs, discussions, releases, and code changes.
2. Study the repository, its open issues, and pull requests for progress and trends.
3. Include progress tracking, goal reminders, highlights, and actionable next steps for maintainers.
4. Keep it concise — adjust length based on actual activity. Be positive and encouraging.`,
  },

  // ── Slash Commands ──────────────────────────────────────────────
  {
    id: 'q',
    name: 'Q - Workflow Optimizer',
    description:
      'Investigate workflow performance, identify missing tools, and optimize agentic workflows',
    category: 'Slash Commands',
    icon: 'terminal',
    trigger: {
      event: 'slash_command',
      slashCommandName: 'q',
      reaction: 'rocket',
    },
    engine: {},
    permissions: {
      contents: 'read',
      actions: 'read',
      issues: 'read',
      'pull-requests': 'read',
    },
    tools: ['agentic-workflows', 'bash', 'edit'],
    safeOutputs: {
      'add-comment': { max: 1 },
      'create-pull-request': {
        'title-prefix': '[q] ',
        labels: ['automation', 'workflow-optimization'],
      },
    },
    network: NETWORK_DEFAULTS,
    instructions: `You are Q, an expert system that improves, optimizes, and fixes agentic workflows.
1. Analyze the trigger context to understand what needs improvement — specific workflow or general optimization.
2. Download recent workflow logs and audit information using the agentic-workflows tool.
3. Identify missing tools, permission errors, repetitive tool calls, and performance issues from live data.
4. Examine workflow files, extract common patterns, and detect configuration issues.
5. Make targeted improvements to workflow files — add missing tools, fix permissions, optimize repetitive operations.
6. Validate all changes using the compile tool, then create a PR with evidence-based improvements.`,
  },
  {
    id: 'repo-ask',
    name: 'Repo Ask',
    description:
      'Research and answer questions about the codebase using web search, code inspection, and bash',
    category: 'Slash Commands',
    icon: 'message-circle',
    trigger: {
      event: 'slash_command',
      slashCommandName: 'repo-ask',
      reaction: 'eyes',
    },
    engine: {},
    permissions: READ_ALL_PERMISSIONS,
    tools: ['web-fetch', 'bash', 'github'],
    safeOutputs: {
      'add-comment': true,
    },
    network: NETWORK_DEFAULTS,
    instructions: `You are a question-answering researcher for a software repository.
1. Read the user's question or research request from the /repo-ask command arguments.
2. Use web search to gather external information, and bash commands to inspect the repository.
3. Analyze repository code, issues, PRs, and discussions for context.
4. Provide an accurate, concise, and relevant answer by posting a comment on the issue or PR.`,
  },
  {
    id: 'plan',
    name: 'Plan - Task Breakdown',
    description:
      'Break down issues or discussions into actionable sub-tasks for development agents',
    category: 'Slash Commands',
    icon: 'list-checks',
    trigger: {
      event: 'slash_command',
      slashCommandName: 'plan',
    },
    engine: {},
    permissions: {
      contents: 'read',
      discussions: 'read',
      issues: 'read',
      'pull-requests': 'read',
    },
    tools: ['github'],
    safeOutputs: {
      'create-issue': {
        'title-prefix': '[task] ',
        labels: ['task', 'ai-generated'],
        max: 5,
      },
      'close-discussion': true,
    },
    network: {},
    instructions: `You are an expert planning assistant. Analyze an issue or discussion and break it into actionable sub-issues.
1. Read the issue/discussion title, body, and comments to understand the scope and complexity.
2. Break down the work into 3-5 clear, actionable sub-issues that can each be completed in a single PR.
3. Order tasks logically — foundational work first, then implementation, then validation.
4. Write each sub-issue with: objective, context, suggested approach, specific files to modify, and acceptance criteria.
5. Create the sub-issues using safe-outputs, automatically linking them to the parent.
6. If triggered from a discussion in the "Ideas" category, close it with a summary comment.`,
  },

  // ── CI/CD ───────────────────────────────────────────────────────
  {
    id: 'ci-doctor',
    name: 'CI Doctor',
    description:
      'Deep-dive investigation of CI failures with root cause analysis and pattern tracking',
    category: 'CI/CD',
    icon: 'activity',
    trigger: {
      event: 'workflow_run',
    },
    engine: {},
    permissions: READ_ALL_PERMISSIONS,
    tools: ['cache-memory', 'web-fetch'],
    safeOutputs: {
      'create-issue': {
        'title-prefix': '[ci-doctor] ',
        labels: ['automation', 'ci'],
      },
      'add-comment': true,
    },
    network: NETWORK_DEFAULTS,
    instructions: `You are the CI Failure Doctor, an expert investigative agent for failed GitHub Actions workflows.
1. Verify the workflow conclusion is 'failure' or 'cancelled'. Exit immediately if successful.
2. Retrieve workflow details, list failed jobs, and get logs with failed_only=true.
3. Analyze logs for error messages, stack traces, dependency failures, test failures, and timeout patterns.
4. Check cache memory for similar past failures and known patterns. Search existing issues for duplicates.
5. Categorize the failure type: code issues, infrastructure, dependencies, configuration, flaky tests, or external services.
6. Create an investigation issue with executive summary, root cause, reproduction steps, recommended actions, prevention strategies, and historical context.`,
  },
  {
    id: 'ci-coach',
    name: 'CI Coach',
    description:
      'Analyze GitHub Actions workflows for efficiency improvements and cost reduction opportunities',
    category: 'CI/CD',
    icon: 'graduation-cap',
    trigger: {
      event: 'schedule',
      schedule: '0 0 * * *',
    },
    engine: {},
    permissions: READ_ALL_PERMISSIONS,
    tools: ['github', 'bash', 'web-fetch'],
    safeOutputs: {
      'create-pull-request': {
        expires: '2d',
        'title-prefix': '[ci-coach] ',
      },
    },
    network: NETWORK_WITH_ECOSYSTEMS,
    instructions: `You are the CI Optimization Coach. Analyze GitHub Actions workflow performance to find optimization opportunities.
1. Discovery: Find all workflow files, identify CI workflows, gather the last 50-100 runs, and collect metrics (runtime, success rates, cache usage).
2. Analysis: Check for job parallelization opportunities, cache optimization, test suite balance, resource sizing, artifact management, and conditional execution.
3. Prioritize by impact (high/medium/low), risk, and effort. Focus on high-impact, low-risk improvements.
4. Implement focused changes to workflow files with inline comments explaining optimizations.
5. Create a pull request with detailed rationale, expected time/cost savings, and testing recommendations.
6. If no improvements found, report that CI workflows are well-optimized and exit.`,
  },

  // ── Documentation ───────────────────────────────────────────────
  {
    id: 'glossary-maintainer',
    name: 'Glossary Maintainer',
    description:
      'Maintain and update the project glossary based on new terms introduced in recent code changes',
    category: 'Documentation',
    icon: 'book-open',
    trigger: {
      event: 'schedule',
      schedule: '0 0 * * 1-5',
    },
    engine: {},
    permissions: {
      contents: 'read',
      issues: 'read',
      'pull-requests': 'read',
      actions: 'read',
    },
    tools: ['cache-memory', 'github', 'edit', 'bash'],
    safeOutputs: {
      'create-pull-request': {
        expires: '2d',
        'title-prefix': '[docs] ',
        labels: ['documentation', 'glossary'],
      },
      noop: true,
    },
    network: { allowed: ['node', 'python', 'github'] },
    instructions: `You are a glossary maintenance agent that keeps project terminology documentation up to date.
1. Locate the glossary file (docs/glossary.md, GLOSSARY.md, or similar). Create one if it would benefit the project.
2. Determine scan scope: full scan (last 7 days) on Mondays, incremental (last 24 hours) on other weekdays.
3. Check cache memory for previously processed commits to avoid duplicate work.
4. Scan recent commits and merged PRs for new technical terms, configuration options, commands, and concepts.
5. Write definitions that follow the existing style — start with what the term is, use clear language, and link to related docs.
6. Create a PR with the glossary updates, or use noop if no new terms are found.`,
  },
  {
    id: 'unbloat-docs',
    name: 'Unbloat Docs',
    description:
      'Reduce documentation verbosity by removing duplicates, consolidating lists, and condensing text',
    category: 'Documentation',
    icon: 'scissors',
    trigger: {
      event: 'schedule',
      schedule: '0 0 * * *',
    },
    engine: { type: 'claude' },
    permissions: {
      contents: 'read',
      'pull-requests': 'read',
      issues: 'read',
    },
    tools: ['cache-memory', 'github', 'edit', 'bash'],
    safeOutputs: {
      'create-pull-request': {
        expires: '2d',
        'title-prefix': '[docs] ',
        labels: ['documentation', 'automation'],
        draft: true,
      },
      'add-comment': { max: 1 },
    },
    network: { allowed: ['defaults', 'github'] },
    instructions: `You are a technical documentation editor focused on clarity and conciseness.
1. Check cache memory for previously cleaned files to avoid re-processing.
2. Scan the repository for markdown documentation files. Skip auto-generated, changelog, and license files.
3. Select ONE file most in need of improvement based on size, bullet-point density, and repetitive patterns.
4. Analyze the file for bloat: duplicate content, excessive bullet lists, redundant examples, verbose descriptions.
5. Make targeted edits — consolidate bullet points into prose or tables, eliminate duplicates, condense verbose text, simplify code samples. Preserve all essential information.
6. Create a draft PR with estimated word/line reduction and a summary of improvements. Aim for at least 20% reduction.`,
  },

  // ── Custom ──────────────────────────────────────────────────────
  {
    id: 'blank-canvas',
    name: 'Blank Canvas',
    description: 'Start from scratch with an empty workflow',
    category: 'Custom',
    icon: 'plus',
    trigger: {},
    engine: {},
    permissions: {},
    tools: [],
    safeOutputs: {},
    network: {},
    instructions: '',
  },
];

export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return templates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return templates.filter((t) => t.category === category);
}

export const templateCategories = [
  'Issue & PR',
  'Scheduled',
  'Slash Commands',
  'CI/CD',
  'Documentation',
  'Custom',
];
