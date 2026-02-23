---
title: Self-Hosted Runners
description: How to configure the runs-on field to target self-hosted or GitHub-hosted runners in agentic workflows.
---

By default, agentic workflows run on `ubuntu-latest` (a GitHub-hosted runner). You can change this using the `runs-on` field in the workflow frontmatter — for example, to use self-hosted runners with private network access or specific hardware capabilities.

> [!WARNING]
> macOS runners (`macos-*`) are not supported. Agentic workflows require container support for the Agent Workflow Firewall sandbox, which GitHub-hosted macOS runners do not provide.
> Use a Linux-based runner instead. See [FAQ](/gh-aw/reference/faq/#why-are-macos-runners-not-supported).

## Configuring `runs-on`

Add `runs-on` to the workflow frontmatter to select a runner for the main agent job.

### Simple runner label

```aw
---
on: issues
runs-on: self-hosted
---

Triage this issue.
```

### Multiple labels

Use an array when you need to match a runner with specific capabilities (for example, a self-hosted Linux runner with GPU support):

```aw
---
on: issues
runs-on: [self-hosted, linux, gpu]
---

Triage this issue.
```

GitHub Actions picks the first available runner matching **all** labels in the array.

### Runner group

Use the object form to target a named runner group (requires GitHub Team or Enterprise):

```aw
---
on: issues
runs-on:
  group: my-runner-group
  labels: [linux, x64]
---

Triage this issue.
```

The `group` key specifies the runner group name. `labels` narrows the selection to runners in that group that carry all listed labels.

## Supported Runner Types

| Runner | Status |
|--------|--------|
| `ubuntu-latest` | ✅ Default |
| `ubuntu-24.04`, `ubuntu-22.04` | ✅ Supported |
| `ubuntu-24.04-arm` | ✅ Supported (Linux ARM64) |
| Self-hosted Linux | ✅ Supported |
| `macos-*` | ❌ Not supported |
| `windows-*` | ❌ Not supported |

## Self-Hosted Runner Requirements

A self-hosted runner must meet these requirements to run agentic workflows:

- **Linux** operating system (x64 or ARM64)
- **Docker** installed and accessible by the runner process
- **Outbound internet access** to GitHub (for Actions, `api.github.com`, and the AI engine)

Docker is required because the Agent Workflow Firewall sandbox runs in a container on the same host.

## Sharing Runner Configuration via Imports

The top-level `runs-on` field is **not importable** from shared agentic workflows — the compiler rejects it to keep runner selection explicit in each workflow.

To share runner configuration across workflows, use `safe-outputs.runs-on`. This controls the runner for [safe output](/gh-aw/reference/safe-outputs/) jobs (add-comment, create-issue, etc.) and can be placed in a shared config file:

```aw title=".github/workflows/shared/runner-config.md"
---
safe-outputs:
  runs-on: self-hosted-linux
---
```

Import it in any workflow:

```aw
---
on: issues
runs-on: self-hosted-linux
imports:
  - shared/runner-config.md
safe-outputs:
  add-comment: {}
permissions:
  issues: write
---

Triage this issue and post a comment.
```

The imported `safe-outputs.runs-on` value is used if the main workflow's `safe-outputs` block does not already specify one (main workflow values always take precedence).

> [!NOTE]
> Set the main agent job's `runs-on` directly in each workflow frontmatter. Only `safe-outputs.runs-on` can be shared via imports.

## Related Documentation

- [Frontmatter reference — `runs-on`](/gh-aw/reference/frontmatter/#run-configuration-run-name-runs-on-timeout-minutes)
- [Imports](/gh-aw/reference/imports/)
- [Reusing Workflows](/gh-aw/guides/packaging-imports/)
- [Safe Outputs](/gh-aw/reference/safe-outputs/)
- [Sandbox Configuration](/gh-aw/reference/sandbox/)
