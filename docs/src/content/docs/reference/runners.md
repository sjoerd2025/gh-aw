---
title: Runners
description: How to configure the runs-on field to select GitHub-hosted or self-hosted runners for your agentic workflows.
---

The `runs-on` field specifies which runner executes the main agentic job. By default, agentic workflows run on `ubuntu-latest`. You only need to set this field when using a self-hosted runner or a specific Ubuntu version.

## Supported runners

Agentic workflows require a Linux runner with Docker support. The agent sandbox uses containers to enforce network egress control and process isolation, which means macOS and Windows runners are not compatible.

| Runner | Supported |
|--------|-----------|
| `ubuntu-latest` | ✅ Default |
| `ubuntu-24.04` / `ubuntu-22.04` | ✅ |
| `ubuntu-24.04-arm` | ✅ Linux ARM64 |
| `self-hosted` | ✅ Linux with Docker |
| `macos-*` | ❌ No container support |
| `windows-*` | ❌ Not supported |

## Configuring a self-hosted runner

### String form

Use a single label to select the runner:

```aw
---
on: push
runs-on: self-hosted
---
```

### Array form

Combine the `self-hosted` label with additional labels to target a specific runner group:

```aw
---
on: push
runs-on: [self-hosted, linux, x64]
---
```

### Object form

Use the object form to select a runner group with optional labels:

```aw
---
on: push
runs-on:
  group: my-runner-group
  labels: [linux, x64]
---
```

## Full example

```aw
---
on:
  pull_request:
    types: [opened, synchronize]
runs-on: [self-hosted, linux, production]
engine: copilot
permissions:
  contents: read
  pull-requests: write
---

Review this pull request and suggest improvements.
```

## Sharing runner configuration

The `runs-on` field is a **main-workflow-only** field. It cannot be placed in a shared workflow file (a file without an `on:` trigger) because it controls how the top-level job is scheduled and the compiler enforces this restriction.

To standardize runner selection across a team, document the expected value in a shared README or as a comment in a shared configuration file that lists other importable fields:

```aw title="shared/base-config.md"
---
# NOTE: Add `runs-on: [self-hosted, linux]` to each workflow
# that needs the internal runner.
tools:
  github:
    toolsets: [default]
network:
  allowed:
    - defaults
---
```

Then import the shared config and add `runs-on` directly in your workflow:

```aw
---
on:
  issues:
    types: [opened]
imports:
  - shared/base-config.md
runs-on: [self-hosted, linux]
engine: copilot
permissions:
  contents: read
  issues: write
---

Triage this issue and apply appropriate labels.
```

> [!NOTE]
> Fields such as `tools:`, `network:`, `permissions:`, and `runtimes:` can be shared via imports. `runs-on` must always be declared in the main workflow. See [Imports](/gh-aw/reference/imports/) for the full list of importable fields.

## Related documentation

- [Frontmatter](/gh-aw/reference/frontmatter/#run-configuration-run-name-runs-on-timeout-minutes) — Full frontmatter reference including `runs-on`
- [Reusing Workflows](/gh-aw/guides/packaging-imports/) — How to use imports to share configuration
- [Imports](/gh-aw/reference/imports/) — Import merge behavior and allowed fields
- [Sandbox](/gh-aw/reference/sandbox/) — Why Linux with Docker is required
- [FAQ](/gh-aw/reference/faq/) — Why macOS runners are not supported
