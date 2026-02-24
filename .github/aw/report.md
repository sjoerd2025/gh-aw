---
description: Guidelines for creating agentic workflows that generate reports as GitHub issues, discussions, or comments.
disable-model-invocation: true
---

# Report Workflow Guidelines

Shared reference for **report workflows**: agentic workflows that generate structured output as GitHub issues, discussions, or comments. Consult this file whenever the workflow you are creating or updating produces a report.

## Choosing the Right Output Type

| Output type | Best for |
|-------------|----------|
| `create-discussion` | Recurring reports (daily/weekly); archive-friendly; no inbox noise |
| `create-issue` | Action-required reports; tasks that need triage or assignment |
| `add-comment` | In-context updates on an existing issue or PR |

**Default for recurring reports**: prefer `create-discussion` in a dedicated category (e.g., `"audits"`) with `close-older-discussions: true` so only the latest report is active.

## Automatic Cleanup

Always configure a cleanup strategy so old reports don't accumulate.

### Discussions and issues: close older entries

```yaml
safe-outputs:
  create-discussion:
    title-prefix: "[my-report] "
    category: "audits"
    close-older-discussions: true  # closes previous discussions with same prefix
    expires: 7d                    # auto-close after 7 days if not already closed
    max: 1

  create-issue:
    title-prefix: "[my-report] "
    close-older-issues: true       # closes previous issues from same workflow
    expires: 7d
    max: 1
```

- `close-older-discussions: true` — closes up to 10 older discussions that match the same `title-prefix` or `labels`, marked as **OUTDATED**. Requires `title-prefix` or `labels`.
- `close-older-issues: true` — closes previous open issues created by the same workflow with the same title prefix or labels.
- `expires` — auto-closes the item after the given time period if not already closed. Accepts integers (days) or relative formats: `2h`, `7d`, `2w`, `1m`, `1y`.

### Comments: hide older entries

For status-update comments on a recurring basis, minimize previous comments instead of closing:

```yaml
safe-outputs:
  add-comment:
    hide-older-comments: true  # minimizes previous comments from same workflow
```

- `hide-older-comments: true` — minimizes previous comments from this workflow before posting a new one. Useful for "latest status" comment patterns.

## Report Structure Guidelines

### 1. Header Levels

**Use h3 (`###`) or lower for all headers in report output.**

The issue or discussion title serves as h1, so all content headers should start at h3:
- Use `###` for main sections (e.g., "### Summary", "### Key Metrics")
- Use `####` for subsections
- Never use `##` (h2) or `#` (h1) in the report body

### 2. Progressive Disclosure

**Wrap detailed content in `<details><summary><b>Section Name</b></summary>` tags** to improve readability and reduce scrolling.

Use collapsible sections for:
- Verbose details (full logs, raw data, per-item breakdowns)
- Secondary information (minor warnings, extra context)
- Long tables with many rows

Always keep critical information visible (summary, critical issues, key metrics).

### 3. Report Structure Pattern

1. **Overview** — 1–2 paragraphs summarizing key findings
2. **Critical Information** — show immediately (summary stats, urgent issues)
3. **Details** — use `<details><summary><b>Section Name</b></summary>` for expanded content
4. **Recommendations** — actionable next steps (always visible)

### Design Principles

Reports should:
- **Build trust through clarity** — most important info immediately visible
- **Exceed expectations** — add helpful context like trends and comparisons
- **Create delight** — use progressive disclosure to reduce overwhelm
- **Maintain consistency** — follow the same patterns across all report workflows

### Example Report Structure

```markdown
### Summary
- Key metric 1: value
- Key metric 2: value
- Status: ✅/⚠️/❌

### Critical Issues
[Always visible - these are important]

<details>
<summary><b>View Detailed Results</b></summary>

[Comprehensive details, logs, traces]

</details>

<details>
<summary><b>View All Warnings</b></summary>

[Minor issues and potential problems]

</details>

### Recommendations
[Actionable next steps - keep visible]
```

## Workflow Run References

- Format run IDs as links: `[§12345](https://github.com/owner/repo/actions/runs/12345)`
- Include up to 3 most relevant run URLs at end under `**References:**`
- Do NOT add footer attribution (the system adds this automatically)

## Human Agency in Reports

When reports cover activity by bots or automation tools, always attribute actions to the humans who triggered them:

- **✅ CORRECT** — "The team leveraged Copilot to deliver 30 PRs" or "@developer used automation to..."
- **❌ INCORRECT** — "The Copilot bot dominated activity" or "automation took over while humans watched"

Check PR/issue assignees, reviewers, mergers, and workflow triggers to credit the humans behind automated actions. Present automation as a productivity tool used **by** humans.

## Frontmatter Checklist for Report Workflows

```yaml
---
description: ...
on: daily           # or weekly, schedule, etc.
permissions: read-all  # expand only if needed for the report

safe-outputs:
  create-discussion:          # or create-issue / add-comment
    title-prefix: "[my-report] "
    category: "audits"        # for discussions
    close-older-discussions: true
    expires: 7d
    max: 1
  noop:                       # always include noop for "nothing to report" runs
---
```

**Include `noop:`** in every report workflow's `safe-outputs` so the agent can explicitly signal "no report needed this run" rather than silently failing.

## Prompt Body Guidelines

In the workflow markdown body, instruct the agent to:

1. Collect data first (deterministic `steps:` where possible)
2. Analyze and interpret
3. Format using the [report structure](#3-report-structure-pattern) above
4. Publish via the appropriate safe output
5. Call `noop` if there is genuinely nothing to report, with a brief explanation
