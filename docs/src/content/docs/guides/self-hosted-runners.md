---
title: Self-Hosted Runners Guide
description: Learn how to route all generated workflow jobs to self-hosted runners to avoid GitHub-hosted minutes consumption.
sidebar:
  order: 460
---

GitHub Agentic Workflows generates several jobs in addition to the main AI agent job (activation, pre-activation, safe-outputs, detection, cache-memory, repo-memory). By default these support jobs run on GitHub-hosted runners (`ubuntu-slim` or `ubuntu-latest`). This guide explains how to run all generated jobs on self-hosted runners with a single frontmatter entry.

## Quick Start

Set `runs-on` in the workflow frontmatter to route **every generated job** to your self-hosted runners:

```aw wrap
---
on:
  issues:
    types: [opened]
runs-on: self-hosted
---

# My Workflow

Analyze the issue and respond.
```

The `runs-on` value is inherited by all generated jobs:

| Job | Runner |
|-----|--------|
| `pre_activation` | `self-hosted` |
| `activation` | `self-hosted` |
| `agent` | `self-hosted` |
| `safe_outputs` | `self-hosted` |
| `detection` *(if threat detection enabled)* | `self-hosted` |
| `update_cache_memory` *(if cache-memory enabled)* | `self-hosted` |
| `push_repo_memory` *(if repo-memory enabled)* | `self-hosted` |
| `unlock` *(if locking enabled)* | `self-hosted` |

## Multi-Label Runners

Use an array of labels to target runners that match all labels:

```aw wrap
---
on:
  issues:
    types: [opened]
runs-on:
  - self-hosted
  - linux
  - x64
---

# My Workflow

Analyze the issue and respond.
```

## Separate Runners for Agent and Support Jobs

For cost optimization, you can run the compute-intensive agent job on powerful self-hosted hardware while keeping lightweight support jobs on GitHub-hosted runners:

```aw wrap
---
on:
  issues:
    types: [opened]
runs-on: [self-hosted, heavy]        # Agent job uses powerful self-hosted runner
safe-outputs:
  runs-on: ubuntu-slim               # Support jobs use lightweight GitHub-hosted runner
  create-issue:
    title-prefix: "[ai] "
---

# My Workflow

Analyze the issue and respond.
```

### Precedence Order

1. **`safe-outputs.runs-on`** – explicit override for all support jobs
2. **`runs-on`** (top-level) – inherited by all jobs when `safe-outputs.runs-on` is not set
3. **`ubuntu-slim`** – built-in default for support jobs when neither is set

## Runner Group Configuration

Use an object to target a specific runner group:

```aw wrap
---
on:
  issues:
    types: [opened]
runs-on:
  group: my-runner-group
  labels:
    - ubuntu-latest
---

# My Workflow

Analyze the issue and respond.
```

## Requirements

Self-hosted runners used by GitHub Agentic Workflows must meet these requirements:

- **Linux only** – macOS runners are not supported because the Agent Workflow Firewall requires Docker containers, which macOS runners do not support. See [FAQ](/gh-aw/reference/faq/#why-are-macos-runners-not-supported).
- **Docker** – the runner must have Docker installed and the user running the workflow must be able to run Docker commands without `sudo`.
- **GitHub Actions runner software** – the standard Actions runner software must be installed and registered.

## FAQ

### Why don't macOS runners work?

macOS GitHub-hosted runners do not support Docker container jobs, which are required for the Agent Workflow Firewall sandbox. Use a Linux self-hosted runner instead.

### Can I set different runners for specific jobs?

Not for individual generated jobs, but you can split agent vs. support jobs using `runs-on` and `safe-outputs.runs-on` as shown in the [Separate Runners](#separate-runners-for-agent-and-support-jobs) section above.

Custom jobs defined in `safe-outputs.jobs` can each specify their own `runs-on`.

### What happens if I don't set runs-on?

- The agent job defaults to `ubuntu-latest`.
- Support jobs default to `ubuntu-slim` (a lightweight 1-vCPU GitHub-hosted runner).
