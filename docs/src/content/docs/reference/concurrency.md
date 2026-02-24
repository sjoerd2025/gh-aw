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

The default per-engine pattern `gh-aw-{engine-id}` ensures only one agent job runs per engine across all workflows, preventing AI resource exhaustion. The group includes only the engine ID and `gh-aw-` prefix - workflow name, issue/PR numbers, and branches are excluded.

```yaml wrap
jobs:
  agent:
    concurrency:
      group: "gh-aw-{engine-id}"
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

Set `engine.concurrency: none` to opt out of the default per-engine job-level concurrency. This is useful when the workflow-level `concurrency` already provides the required isolation (for example, a `workflow_dispatch` workflow that processes individual issues and includes the issue number in its concurrency group):

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
  concurrency: none  # Disable default job-level concurrency; rely on workflow-level group above
---
```

Without `engine.concurrency: none`, the compiled agent job would use `gh-aw-copilot-${{ github.workflow }}` as its concurrency group, which serializes all runs of the workflow regardless of the issue number. Setting it to `none` allows different issues to be processed in parallel while still cancelling duplicate runs for the same issue.

## Related Documentation

- [AI Engines](/gh-aw/reference/engines/) - Engine configuration and capabilities
- [Frontmatter](/gh-aw/reference/frontmatter/) - Complete frontmatter reference
- [Workflow Structure](/gh-aw/reference/workflow-structure/) - Overall workflow organization
