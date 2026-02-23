---
title: Self-Hosted Runners
description: How to configure the runs-on field to select a runner for your agentic workflow, including self-hosted runners and sharing runner configuration via shared workflow files.
---

Agentic workflows run on GitHub Actions runners. By default, every workflow runs on `ubuntu-latest`. Use the `runs-on` field in your workflow's frontmatter to target a different runner—including self-hosted runners with specialized hardware or software.

## Configuring `runs-on`

The `runs-on` field mirrors the standard GitHub Actions syntax and supports three formats.

### String (single label)

The simplest form targets a single runner label:

```aw
---
on: issues
runs-on: ubuntu-24.04
---

Triage this issue.
```

### Array (multiple labels)

Provide an array when you want GitHub Actions to select the first available runner that matches **all** the labels:

```aw
---
on: issues
runs-on: [self-hosted, linux, x64]
---

Triage this issue.
```

### Object (group + labels)

Use the object form to target a named runner group, optionally restricted to specific labels:

```aw
---
on: issues
runs-on:
  group: large-runners
  labels: [linux, x64]
---

Triage this issue.
```

## Supported runners

Agentic workflows require a Linux runner with Docker container support. This is needed for the [Agent Workflow Firewall](/gh-aw/reference/sandbox/), which provides network egress control and process isolation.

| Runner | Status |
|---|---|
| `ubuntu-latest` | ✅ Default. Recommended for most workflows. |
| `ubuntu-24.04` / `ubuntu-22.04` | ✅ Supported. |
| `ubuntu-24.04-arm` | ✅ Supported. Linux ARM64. |
| `macos-*` | ❌ Not supported. macOS runners do not support Docker container jobs. |
| `windows-*` | ❌ Not supported. Windows runners are not compatible with the workflow sandbox. |

> [!NOTE]
> The `runs-on` field only controls the **agent job** runner. The default runner for safe-outputs jobs (issue creation, PR comments, etc.) is set separately via [`safe-outputs.runs-on`](#sharing-runner-configuration-via-imports).

## Self-hosted runner requirements

Self-hosted runners must meet these requirements to run agentic workflows:

- **Linux** operating system (Ubuntu recommended)
- **Docker** installed and accessible to the runner process
- **Docker container jobs** enabled (not disabled by the runner's configuration)
- Network access to GitHub APIs and your configured domains

> [!TIP]
> If your runner is air-gapped or has restricted outbound network access, configure the [`network:`](/gh-aw/reference/network/) field to declare which domains the workflow is allowed to reach.

## Sharing runner configuration via imports

Runner configuration for the safe-outputs job can be shared across workflows using a shared workflow file. This is useful when multiple workflows need the same runner group for processing outputs like issue creation and PR comments.

Create a shared file, for example `.github/workflows/shared/runner-config.md`:

```aw
---
safe-outputs:
  runs-on: self-hosted
---
```

Then import it in your workflows:

```aw
---
on: issues
runs-on: self-hosted
imports:
  - shared/runner-config.md
permissions:
  issues: write
---

Triage this issue and create a summary comment.
```

When compiled, the agent job uses the `runs-on` value from the main workflow's frontmatter, and the safe-outputs processing job uses the `runs-on` value from the imported `safe-outputs:` configuration.

> [!NOTE]
> The top-level `runs-on` field (for the agent job) is set per-workflow and is not merged from shared imports. Only `safe-outputs.runs-on` (for the safe-outputs processing job) is importable. Set the agent job runner in each workflow's own frontmatter.

### Sharing agent runner labels with a shared file

To make your intended runner easy to reference consistently, document the expected runner in the shared file as a comment alongside the safe-outputs configuration:

```aw
---
# All workflows importing this file should use:
# runs-on: [self-hosted, linux, x64, large]
safe-outputs:
  runs-on: self-hosted
---

These workflows target the self-hosted Linux runner pool.
Use `runs-on: [self-hosted, linux, x64, large]` in your workflow frontmatter.
```

## Example: workflow with a self-hosted runner

```aw
---
on:
  issues:
    types: [opened]
runs-on: [self-hosted, linux, x64]
engine: copilot
permissions:
  issues: write
  contents: read
safe-outputs:
  create-comment: {}
---

Analyze this issue and post a summary comment.
```

## Related documentation

- [Frontmatter](/gh-aw/reference/frontmatter/#run-configuration-run-name-runs-on-timeout-minutes) — Complete `runs-on` syntax reference
- [Imports](/gh-aw/reference/imports/) — How to share configuration across workflows
- [Reusing Workflows](/gh-aw/guides/packaging-imports/) — Distributing and updating shared workflow files
- [Sandbox](/gh-aw/reference/sandbox/) — Agent Workflow Firewall and container requirements
- [Network Access](/gh-aw/reference/network/) — Configuring outbound network permissions
- [FAQ](/gh-aw/reference/faq/#why-are-macos-runners-not-supported) — Why macOS runners are not supported
