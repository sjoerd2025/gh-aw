---
title: Concurrency Control
description: Complete guide to concurrency control in GitHub Agentic Workflows, including agent job concurrency configuration and engine isolation.
sidebar:
  order: 1400
---

GitHub Agentic Workflows uses dual-level concurrency control to prevent resource exhaustion and ensure predictable execution:
- **Per-workflow**: Limits based on workflow name and trigger context (issue, PR, branch)
- **Per-engine**: Limits AI execution across all workflows via `engine.concurrency`

## Per-Workflow Concurrency

Workflow-level concurrency groups include the workflow name plus context-specific identifiers:

| Trigger Type | Concurrency Group | Cancel In Progress |
|--------------|-------------------|-------------------|
| Issues | `gh-aw-${{ github.workflow }}-${{ issue.number }}` | No |
| Pull Requests | `gh-aw-${{ github.workflow }}-${{ pr.number \|\| ref }}` | Yes (new commits cancel outdated runs) |
| Push | `gh-aw-${{ github.workflow }}-${{ github.ref }}` | No |
| Schedule/Other | `gh-aw-${{ github.workflow }}` | No |

This ensures workflows on different issues, PRs, or branches run concurrently without interference.

## Per-Engine Concurrency

By default, no job-level concurrency is applied to agent jobs (`engine.concurrency: none` is the default). This allows multiple agent jobs — even across different workflows — to execute in parallel without any engine-level serialization.

To opt in to job-level concurrency and limit how many agent jobs run simultaneously, set `engine.concurrency` explicitly:

```yaml wrap
---
engine:
  id: copilot
  concurrency:  # Limit to one agent job per engine across all workflows
    group: "gh-aw-copilot-${{ github.workflow }}"
---
```

## Custom Concurrency

Override either level independently:

```yaml wrap
---
on: push
concurrency:  # Workflow-level
  group: custom-group-${{ github.ref }}
  cancel-in-progress: true
engine:
  id: copilot
  concurrency:  # Engine-level
    group: "gh-aw-copilot-${{ github.workflow }}"
tools:
  github:
    allowed: [list_issues]
---
```

## Disabling Job-Level Concurrency

Since `engine.concurrency: none` is the default, no action is required to run workflow dispatches in parallel. The workflow-level `concurrency` block is sufficient for per-issue isolation:

```yaml wrap
---
on:
  workflow_dispatch:
    inputs:
      issue_number:
        required: true
concurrency:
  group: issue-triage-${{ github.event.inputs.issue_number }}
  cancel-in-progress: true
engine:
  id: copilot
  # No engine.concurrency needed - none is the default
---
```

You can also be explicit by setting `engine.concurrency: none`:

```yaml wrap
engine:
  id: copilot
  concurrency: none  # Explicit opt-out of job-level concurrency
```

## Related Documentation

- [AI Engines](/gh-aw/reference/engines/) - Engine configuration and capabilities
- [Frontmatter](/gh-aw/reference/frontmatter/) - Complete frontmatter reference
- [Workflow Structure](/gh-aw/reference/workflow-structure/) - Overall workflow organization
