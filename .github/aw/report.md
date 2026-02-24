# Report Workflows

Shared reference for **report workflows**: agentic workflows whose primary output is a human-readable report posted as a GitHub issue, discussion, or comment.

Consult this file alongside the create or update prompt whenever the workflow you are building is meant to generate a report.

---

## Choosing the right output type

| Output type | When to use |
|-------------|-------------|
| `create-discussion` | Recurring reports (daily, weekly). Archive-friendly, no inbox noise. Pair with `close-older-discussions: true`. |
| `create-issue` | Actionable reports that need triage, assignment, or follow-up. Pair with `close-older-issues: true`. |
| `add-comment` | Status update on an existing issue or PR. Pair with `hide-older-comments: true`. |

Default for recurring reports: **prefer `create-discussion`** in a dedicated category (e.g. `"audits"`) so reports accumulate in one place without cluttering the issue tracker.

---

## Automatic cleanup

Always configure a cleanup strategy. Reports that accumulate without expiry create noise.

### `close-older-discussions: true`

Closes up to 10 older discussions matching the same `title-prefix` or `labels` before creating a new one. Requires `title-prefix` or `labels` to be set.

```yaml
safe-outputs:
  create-discussion:
    title-prefix: "[weekly-report] "
    category: "audits"
    max: 1
    close-older-discussions: true
```

### `close-older-issues: true`

Closes previous open issues created by the same workflow before creating a new one. Requires `title-prefix` or `labels`.

```yaml
safe-outputs:
  create-issue:
    title-prefix: "[weekly-report] "
    labels: [automated-report]
    max: 1
    close-older-issues: true
```

### `hide-older-comments: true`

Minimizes previous comments from the same workflow before posting a new one. Ideal for "current status" comment patterns on long-running issues.

```yaml
safe-outputs:
  add-comment:
    hide-older-comments: true
    max: 1
```

### `expires`

Auto-closes the issue, discussion, or PR after a time period if it has not already been closed. Accepts integers (days) or relative formats: `2h`, `7d`, `2w`, `1m`, `1y`.

```yaml
safe-outputs:
  create-discussion:
    title-prefix: "[daily-report] "
    expires: 7d
    close-older-discussions: true
    max: 1
```

Use `expires` as a safety net when `close-older-*` may not reliably run (e.g. infrequent schedules or after workflow deletion).

---

## Report structure guidelines

The following formatting rules apply to content posted to GitHub issues and discussions.

### 1. Header levels

**Use `###` (h3) or lower for all headers in your report.**

The issue or discussion title serves as h1. All report headers must start at h3:

- `###` for main sections (e.g. "### Summary", "### Key Metrics")
- `####` for subsections (e.g. "#### By repository")
- Never use `##` or `#` inside a report body — these are reserved for titles

### 2. Progressive disclosure

**Wrap verbose sections in `<details><summary><b>…</b></summary>` tags** to reduce scrolling while keeping critical info visible.

Collapse:
- Full logs, raw data, long per-item breakdowns
- Secondary information (minor warnings, extra context)

Always keep visible: the summary, critical issues, and key metrics.

### 3. Structure pattern

1. **Overview** — 1–2 paragraphs of key findings
2. **Critical information** — summary stats and urgent issues, always visible
3. **Details** — collapsible `<details>` blocks for verbose content
4. **Recommendations** — actionable next steps, always visible

### Design principles

Reports should:

- **Build trust through clarity** — most important information immediately visible
- **Exceed expectations** — add helpful context like trends and comparisons
- **Create delight** — use progressive disclosure to reduce overwhelm
- **Maintain consistency** — follow the same patterns across all report workflows

### Example structure

```markdown
### Summary
- Key metric 1: value
- Key metric 2: value
- Status: ✅/⚠️/❌

### Critical Issues
[Always visible]

<details>
<summary><b>View Detailed Results</b></summary>

[Logs, traces, full breakdown]

</details>

<details>
<summary><b>View All Warnings</b></summary>

[Minor issues, extra context]

</details>

### Recommendations
[Actionable next steps — always visible]
```

---

## Workflow run references

- Format run IDs as links: `[§12345](https://github.com/owner/repo/actions/runs/12345)`
- Include up to 3 most relevant run URLs at the end under `**References:**`
- Do **not** add a footer attribution line — the system adds this automatically
