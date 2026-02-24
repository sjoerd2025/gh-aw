# Report Generation

Shared reference for **workflows that generate reports**: periodic summaries, status updates, audits, or any output where structured content is published to GitHub issues, discussions, or comments.

## Choosing where to publish

| Output type | Use when |
|---|---|
| `create-issue` | Standalone report that may receive follow-up comments; searchable; trackable |
| `create-discussion` | Community-facing summaries or Q&A-style content with threaded replies |
| `add-comment` | Rolling status updates on an existing issue, PR, or discussion |

## Automatic cleanup

Reports accumulate over time. **Always configure at least one cleanup strategy** for recurring reports:

### Issues (`create-issue`)

- `close-older-issues: true` — closes previous issues from the same workflow before creating a new one (requires `title-prefix` or `labels` to identify matches)
- `expires: 7d` — auto-closes the issue after N days (supports: `2h`, `7d`, `2w`, `1m`, `1y`)

### Discussions (`create-discussion`)

- `close-older-discussions: true` — closes older discussions with the same `title-prefix` or `labels` as "OUTDATED"
- `expires: 7d` — auto-closes the discussion after N days

### Comments (`add-comment`)

- `hide-older-comments: true` — minimizes previous comments from the same workflow before posting a new one

### Recommended patterns

```yaml
# Recurring report as an issue — replace each run
safe-outputs:
  create-issue:
    title-prefix: "[weekly-report] "
    labels: [automated-report]
    close-older-issues: true
    expires: 14d

# Rolling status comment — update in place
safe-outputs:
  add-comment:
    hide-older-comments: true
    max: 1

# Discussion-based report — close stale ones
safe-outputs:
  create-discussion:
    title-prefix: "[report] "
    close-older-discussions: true
    expires: 30d
```

## Report formatting

### Header levels

Use `###` (h3) or lower for all headers in report content. Never use `#` or `##` — these are reserved for titles.

- `###` for main sections (e.g., `### Summary`)
- `####` for subsections (e.g., `#### Per-repo Breakdown`)

### Structure pattern

1. **Overview**: 1–2 paragraphs summarizing key findings
2. **Critical information**: Always visible — summary stats, blockers, key metrics
3. **Details**: Use `<details><summary><b>Section Name</b></summary>` for expanded content
4. **Context**: Add metadata (workflow run link, date, trigger)

### Progressive disclosure

Wrap verbose or secondary content in collapsible sections to reduce scrolling:

```markdown
<details>
<summary><b>View Detailed Results</b></summary>

[Full logs, raw data, per-item breakdowns]

</details>
```

Always keep critical information visible. Only collapse:

- Verbose details (full logs, raw data)
- Secondary information (minor warnings, extra context)
- Per-item breakdowns when there are many items

### Design principles

- **Clarity first**: Most important information immediately visible
- **Exceed expectations**: Add helpful context like trends and comparisons
- **Progressive disclosure**: Reduce overwhelm by collapsing details
- **Consistency**: Follow these patterns across all reports

### Example report structure

```markdown
### Summary
- Key metric 1: value
- Key metric 2: value
- Status: ✅ / ⚠️ / ❌

### Critical Issues
[Always visible]

<details>
<summary><b>View Detailed Results</b></summary>

[Comprehensive details, logs, traces]

</details>

<details>
<summary><b>View All Warnings</b></summary>

[Minor issues and potential problems]

</details>

### Recommendations
[Actionable next steps — keep visible]
```

## Workflow run references

- Format run IDs as links: `[§12345](https://github.com/owner/repo/actions/runs/12345)`
- Include up to 3 most relevant run URLs at the end under `**References:**`
- Do not add footer attribution (the system adds it automatically)
