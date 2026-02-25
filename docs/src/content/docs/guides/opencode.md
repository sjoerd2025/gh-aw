---
title: Using OpenCode Engine
description: Guide to using the OpenCode engine with GitHub Agentic Workflows — a provider-agnostic, BYOK AI coding agent supporting 75+ models from Anthropic, OpenAI, Google, Groq, and more.
sidebar:
  order: 8
---

[OpenCode](https://opencode.ai/) is an open-source, provider-agnostic AI coding agent for the terminal. Unlike other engines that are locked to a single AI provider, OpenCode follows a **Bring Your Own Key (BYOK)** model — you can use models from Anthropic, OpenAI, Google, Groq, Mistral, DeepSeek, xAI, and many others.

> [!NOTE]
> The OpenCode engine is **experimental**. It is functional and smoke-tested, but may have rough edges compared to the more established Claude or Copilot engines. Please report issues if you encounter them.

## Quick Start

The simplest OpenCode workflow uses Anthropic (the default provider) and requires only an `ANTHROPIC_API_KEY` secret:

```aw wrap
---
on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write

engine: opencode

tools:
  github:
    toolsets: [repos, issues]
  edit:
  bash: true
---

Analyze the newly opened issue and add a comment with a summary of what the issue is requesting.
```

To compile and use this workflow:

1. Add the `ANTHROPIC_API_KEY` secret to your repository (see [Authentication](/gh-aw/reference/auth/))
2. Save the workflow as `.github/workflows/my-workflow.md`
3. Run `gh aw compile .github/workflows/my-workflow.md`

## Authentication and Providers

### Default: Anthropic

By default, OpenCode uses Anthropic as its AI provider. You only need one secret:

- **`ANTHROPIC_API_KEY`** — Your Anthropic API key

```yaml wrap
engine: opencode
```

This is equivalent to:

```yaml wrap
engine:
  id: opencode
  model: anthropic/claude-sonnet-4-20250514
```

### Using Other Providers

OpenCode supports many providers through the `engine.env` field. Specify the model in `provider/model` format and pass the appropriate API key:

#### OpenAI

```yaml wrap
engine:
  id: opencode
  model: openai/gpt-4.1
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

Required secret: `OPENAI_API_KEY`

#### Google (Gemini)

```yaml wrap
engine:
  id: opencode
  model: google/gemini-2.5-pro
  env:
    GOOGLE_API_KEY: ${{ secrets.GOOGLE_API_KEY }}
```

Required secret: `GOOGLE_API_KEY`

#### Groq

```yaml wrap
engine:
  id: opencode
  model: groq/llama-4-scout-17b-16e-instruct
  env:
    GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}
```

Required secret: `GROQ_API_KEY`

#### Mistral

```yaml wrap
engine:
  id: opencode
  model: mistral/mistral-large-latest
  env:
    MISTRAL_API_KEY: ${{ secrets.MISTRAL_API_KEY }}
```

Required secret: `MISTRAL_API_KEY`

#### DeepSeek

```yaml wrap
engine:
  id: opencode
  model: deepseek/deepseek-chat
  env:
    DEEPSEEK_API_KEY: ${{ secrets.DEEPSEEK_API_KEY }}
```

Required secret: `DEEPSEEK_API_KEY`

#### xAI (Grok)

```yaml wrap
engine:
  id: opencode
  model: xai/grok-3
  env:
    XAI_API_KEY: ${{ secrets.XAI_API_KEY }}
```

Required secret: `XAI_API_KEY`

### Model Format

Models are specified in `provider/model` format. The provider prefix determines which API endpoint and credentials are used:

| Provider | Prefix | Example Model | API Key Secret |
|----------|--------|---------------|----------------|
| Anthropic | `anthropic/` | `anthropic/claude-sonnet-4-20250514` | `ANTHROPIC_API_KEY` |
| OpenAI | `openai/` | `openai/gpt-4.1` | `OPENAI_API_KEY` |
| Google | `google/` | `google/gemini-2.5-pro` | `GOOGLE_API_KEY` |
| Groq | `groq/` | `groq/llama-4-scout-17b-16e-instruct` | `GROQ_API_KEY` |
| Mistral | `mistral/` | `mistral/mistral-large-latest` | `MISTRAL_API_KEY` |
| DeepSeek | `deepseek/` | `deepseek/deepseek-chat` | `DEEPSEEK_API_KEY` |
| xAI | `xai/` | `xai/grok-3` | `XAI_API_KEY` |

If no model is specified, OpenCode defaults to Anthropic.

## Network Security

### How It Works

When the firewall is enabled (the default), all API calls from the OpenCode agent are proxied through a secure network layer. This provides two key security properties:

1. **Credential isolation** — API keys are never exposed inside the agent's execution environment. A separate proxy service injects authentication headers, so even a compromised agent cannot read your API keys.
2. **Domain allowlisting** — Only approved network domains are accessible. All other traffic is blocked at the network level.

This happens automatically. You do not need to configure any proxy settings.

### Dynamic Domain Allowlists

The compiler automatically adds the appropriate API domains based on your model's provider prefix. For example, `model: openai/gpt-4.1` automatically allows `api.openai.com`.

The following domains are always allowed for OpenCode workflows:

| Domain | Purpose |
|--------|---------|
| `host.docker.internal` | Internal MCP gateway and API proxy access |
| `registry.npmjs.org` | OpenCode CLI npm package downloads |

Provider-specific domains added automatically:

| Provider | Domain |
|----------|--------|
| Anthropic (default) | `api.anthropic.com` |
| OpenAI | `api.openai.com` |
| Google | `generativelanguage.googleapis.com` |
| Groq | `api.groq.com` |
| Mistral | `api.mistral.ai` |
| DeepSeek | `api.deepseek.com` |
| xAI | `api.x.ai` |

### Adding Custom Domains

Use the `network` field to allow additional domains your workflow needs:

```yaml wrap
engine:
  id: opencode
  model: anthropic/claude-sonnet-4-20250514

network:
  allowed:
    - defaults          # Basic infrastructure
    - python            # Python/PyPI ecosystem
    - "api.example.com" # Custom domain
```

See [Network Permissions](/gh-aw/reference/network/) for the full reference on ecosystem identifiers and domain configuration.

## MCP Server Support

OpenCode has full support for the [Model Context Protocol](/gh-aw/reference/glossary/#mcp-model-context-protocol) (MCP) through the MCP Gateway. This allows your workflow to connect the agent to GitHub APIs, web fetching, and custom tools.

### GitHub Tools

```aw wrap
---
on:
  issues:
    types: [opened]

permissions:
  contents: read
  issues: write
  pull-requests: read

engine:
  id: opencode
  model: anthropic/claude-sonnet-4-20250514

tools:
  github:
    toolsets: [repos, issues, pull_requests]
  edit:
  bash: true
---

Analyze this issue and provide a detailed response.
```

### Web Fetch

```yaml wrap
tools:
  web-fetch:
  github:
    toolsets: [repos]
```

### Custom MCP Servers

OpenCode supports all MCP server types (stdio, container, HTTP). See [Using MCPs](/gh-aw/guides/mcps/) for complete documentation on configuring custom MCP servers.

```yaml wrap
tools:
  github:
    toolsets: [repos, issues]
  edit:
  bash: true

mcp-servers:
  microsoftdocs:
    url: "https://learn.microsoft.com/api/mcp"
    allowed: ["*"]
```

## Extended Configuration

### Pinning the OpenCode Version

```yaml wrap
engine:
  id: opencode
  version: "1.2.14"
```

### Custom CLI Command

```yaml wrap
engine:
  id: opencode
  command: /usr/local/bin/opencode-custom
```

When a custom `command` is specified, the automatic installation step is skipped.

### Custom Environment Variables

```yaml wrap
engine:
  id: opencode
  env:
    DEBUG_MODE: "true"
    CUSTOM_SETTING: "value"
```

### Command-Line Arguments

```yaml wrap
engine:
  id: opencode
  args: ["--verbose"]
```

## Example Workflows

### Simple Issue Triage

```aw wrap
---
on:
  issues:
    types: [opened]
  reaction: "eyes"

permissions:
  contents: read
  issues: write

engine: opencode

tools:
  github:
    toolsets: [repos, issues]
  bash: true

safe-outputs:
  add-comment:
    max: 1
  add-labels:
    allowed: [bug, feature, question, documentation]
---

Analyze the issue and:
1. Determine the category (bug, feature, question, or documentation)
2. Add the appropriate label
3. Post a brief comment summarizing your analysis
```

### Multi-Provider Code Review (OpenAI)

```aw wrap
---
on:
  pull_request:
    types: [opened, synchronize]
  reaction: "eyes"

permissions:
  contents: read
  pull-requests: write

engine:
  id: opencode
  model: openai/gpt-4.1
  env:
    OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}

tools:
  github:
    toolsets: [repos, pull_requests]
  edit:
  bash: true

safe-outputs:
  add-comment:
    max: 1
---

Review the pull request changes and provide constructive feedback.
Focus on code quality, potential bugs, and adherence to best practices.
```

### Workflow with MCP Tools and Web Access

```aw wrap
---
on:
  issues:
    types: [labeled]
    names: ["research"]
  reaction: "rocket"

permissions:
  contents: read
  issues: write

engine:
  id: opencode
  model: anthropic/claude-sonnet-4-20250514

tools:
  github:
    toolsets: [repos, issues]
  web-fetch:
  edit:
  bash: true

network:
  allowed:
    - defaults
    - github
    - node

safe-outputs:
  add-comment:
    max: 2
---

Research the topic described in this issue:
1. Use web-fetch to gather relevant information
2. Analyze the findings
3. Post a summary comment with your research results and recommendations
```

## Comparison with Other Engines

| Feature | OpenCode | Claude | Copilot | Codex | Gemini |
|---------|----------|--------|---------|-------|--------|
| **Provider** | Any (BYOK) | Anthropic | GitHub/OpenAI | OpenAI | Google |
| **Default Secret** | `ANTHROPIC_API_KEY` | `ANTHROPIC_API_KEY` | `COPILOT_GITHUB_TOKEN` | `OPENAI_API_KEY` | `GEMINI_API_KEY` |
| **MCP Support** | Yes | Yes | Yes | No | Yes |
| **Open Source** | Yes | No | No | Yes | No |
| **Model Selection** | `provider/model` format | Fixed | Configurable | Fixed | Fixed |
| **Status** | Experimental | Stable | Stable | Stable | Stable |
| **Headless Mode** | `opencode run` | `claude -p` | `copilot` | `codex --full-auto` | `gemini` |
| **Custom Agents** | Via config | Via `CLAUDE.md` | Via `.agent.md` | N/A | N/A |

**When to use OpenCode:**

- You want to use models from multiple providers without changing engines
- You need an open-source agent for auditability
- You want BYOK flexibility to switch models easily
- You are evaluating different AI providers for your workflows

**When to use other engines:**

- **Claude** — Best integration with Anthropic models, most mature for complex coding tasks
- **Copilot** — Default choice, tightly integrated with GitHub, no external API key needed for Copilot subscribers
- **Codex** — Best for OpenAI-native workflows, built-in sandboxing
- **Gemini** — Best for Google Cloud-integrated workflows

## Known Limitations

1. **Experimental status** — The OpenCode engine integration is under active development. Behavior may change between releases.

2. **Single-provider API proxy** — The API proxy currently routes all requests through the default provider (Anthropic). When using a non-Anthropic provider (e.g., `openai/gpt-4.1`), the provider's API endpoint is added to the domain allowlist, but credential injection through the proxy is only available for the default provider. Non-default providers must pass their API key via `engine.env`.

3. **Permissions auto-approval** — OpenCode's tool permissions are automatically set to `allow` in CI mode to prevent the agent from hanging on permission prompts. This is expected behavior for headless execution.

4. **`NO_PROXY` configuration** — OpenCode uses an internal client-server architecture. The `NO_PROXY=localhost,127.0.0.1` environment variable is automatically configured to prevent internal traffic from being intercepted by the network firewall. You do not need to set this yourself.

## Related Documentation

- [AI Engines](/gh-aw/reference/engines/) — Overview of all available engines
- [Authentication](/gh-aw/reference/auth/) — Secret configuration for all engines
- [Network Permissions](/gh-aw/reference/network/) — Domain allowlists and firewall configuration
- [Using MCPs](/gh-aw/guides/mcps/) — MCP server configuration
- [Tools](/gh-aw/reference/tools/) — Tool configuration reference
- [Frontmatter](/gh-aw/reference/frontmatter/) — Complete frontmatter reference
- [OpenCode Documentation](https://opencode.ai/docs/) — Official OpenCode documentation
