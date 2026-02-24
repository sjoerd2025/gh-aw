import type { WorkflowState } from '../types/workflow';

/**
 * Convert store state to a valid markdown workflow string with YAML frontmatter.
 */
export function generateMarkdown(state: WorkflowState): string {
  const frontmatter = buildFrontmatter(state);
  const body = state.instructions.trim();

  if (!frontmatter) {
    return body ? body + '\n' : '';
  }

  const parts = ['---', frontmatter, '---'];
  if (body) {
    parts.push('', body);
  }
  return parts.join('\n') + '\n';
}

function buildFrontmatter(state: WorkflowState): string {
  const lines: string[] = [];

  // name
  if (state.name) {
    lines.push(`name: ${yamlString(state.name)}`);
  }

  // description
  if (state.description) {
    lines.push(`description: ${yamlString(state.description)}`);
  }

  // on (trigger)
  const triggerLines = buildTrigger(state);
  if (triggerLines.length > 0) {
    lines.push(...triggerLines);
  }

  // engine
  const engineLines = buildEngine(state);
  if (engineLines.length > 0) {
    lines.push(...engineLines);
  }

  // permissions
  const permLines = buildPermissions(state);
  if (permLines.length > 0) {
    lines.push(...permLines);
  }

  // tools
  const toolLines = buildTools(state);
  if (toolLines.length > 0) {
    lines.push(...toolLines);
  }

  // safe-outputs
  const safeOutputLines = buildSafeOutputs(state);
  if (safeOutputLines.length > 0) {
    lines.push(...safeOutputLines);
  }

  // network
  const networkLines = buildNetwork(state);
  if (networkLines.length > 0) {
    lines.push(...networkLines);
  }

  // concurrency
  const concurrencyLines = buildConcurrency(state);
  if (concurrencyLines.length > 0) {
    lines.push(...concurrencyLines);
  }

  // rate-limit
  const rateLimitLines = buildRateLimit(state);
  if (rateLimitLines.length > 0) {
    lines.push(...rateLimitLines);
  }

  // platform
  if (state.platform) {
    lines.push(`platform: ${yamlString(state.platform)}`);
  }

  // timeout-minutes
  if (state.timeoutMinutes && state.timeoutMinutes !== 15) {
    lines.push(`timeout-minutes: ${state.timeoutMinutes}`);
  }

  // imports
  if (state.imports.length > 0) {
    lines.push('imports:');
    for (const imp of state.imports) {
      lines.push(`  - ${yamlString(imp)}`);
    }
  }

  // env
  if (Object.keys(state.environment).length > 0) {
    lines.push('env:');
    for (const [key, value] of Object.entries(state.environment)) {
      lines.push(`  ${key}: ${yamlString(value)}`);
    }
  }

  // strict
  if (state.strict) {
    lines.push('strict: true');
  }

  // cache
  if (state.cache) {
    lines.push('cache: true');
  }

  return lines.join('\n');
}

function buildTrigger(state: WorkflowState): string[] {
  const { trigger } = state;
  if (!trigger.event) return [];

  const lines: string[] = [];

  // Check if any modifiers will be applied (determines output form)
  const hasModifiers = !!(trigger.reaction || trigger.statusComment || trigger.skipBots ||
    trigger.skipRoles.length > 0 || trigger.roles.length > 0 ||
    trigger.bots.length > 0 || trigger.manualApproval);

  // Simple trigger events that don't need sub-configuration
  const simpleEvents = new Set([
    'create', 'delete', 'fork', 'page_build', 'public',
    'status', 'gollum', 'deployment', 'deployment_status',
  ]);

  if (trigger.event === 'schedule') {
    lines.push('on:');
    lines.push(`  schedule: ${yamlString(resolveFuzzySchedule(trigger.schedule || '0 0 * * *'))}`);
  } else if (trigger.event === 'workflow_dispatch') {
    lines.push('on:');
    lines.push('  workflow_dispatch:');
  } else if (trigger.event === 'slash_command') {
    lines.push('on:');
    if (trigger.slashCommandName) {
      lines.push(`  slash_command: ${yamlString(trigger.slashCommandName)}`);
    } else {
      lines.push('  slash_command:');
    }
  } else if (simpleEvents.has(trigger.event)) {
    if (hasModifiers) {
      // Need mapping form for modifier siblings
      lines.push('on:');
      lines.push(`  ${trigger.event}:`);
    } else {
      lines.push(`on: ${trigger.event}`);
    }
  } else {
    // Events with types/branches/paths configuration
    const hasActivityTypes = trigger.activityTypes.length > 0;
    const hasBranches = trigger.branches.length > 0;
    const hasPaths = trigger.paths.length > 0;

    if (hasActivityTypes || hasBranches || hasPaths) {
      lines.push('on:');
      lines.push(`  ${trigger.event}:`);
      if (hasActivityTypes) {
        lines.push(`    types: [${trigger.activityTypes.join(', ')}]`);
      }
      if (hasBranches) {
        lines.push(`    branches: [${trigger.branches.join(', ')}]`);
      }
      if (hasPaths) {
        lines.push(`    paths: [${trigger.paths.join(', ')}]`);
      }
    } else if (hasModifiers) {
      // No event config but has modifiers — need mapping form
      lines.push('on:');
      lines.push(`  ${trigger.event}:`);
    } else {
      // No config, no modifiers — use simple string form.
      // This avoids producing 'event_name:' (null) which fails
      // validation for events like workflow_run.
      lines.push(`on: ${trigger.event}`);
    }
  }

  // Trigger modifiers — always in mapping form at this point
  if (trigger.reaction) {
    lines.push(`  reaction: ${trigger.reaction}`);
  }

  if (trigger.statusComment) {
    lines.push('  status-comment: true');
  }

  if (trigger.skipBots) {
    lines.push('  skip-bots: true');
  }

  if (trigger.skipRoles.length > 0) {
    lines.push(`  skip-roles: [${trigger.skipRoles.join(', ')}]`);
  }

  if (trigger.roles.length > 0) {
    lines.push(`  roles: [${trigger.roles.join(', ')}]`);
  }

  if (trigger.bots.length > 0) {
    lines.push(`  bots: [${trigger.bots.join(', ')}]`);
  }

  if (trigger.manualApproval) {
    lines.push(`  manual-approval: ${yamlString(trigger.manualApproval)}`);
  }

  return lines;
}

function buildEngine(state: WorkflowState): string[] {
  const { engine } = state;
  if (!engine.type) return [];

  const hasEngineConfig = engine.config && Object.keys(engine.config).length > 0;
  const hasExtraConfig = engine.model || engine.maxTurns || engine.version || hasEngineConfig;

  if (!hasExtraConfig) {
    return [`engine: ${engine.type}`];
  }

  const lines = ['engine:'];
  lines.push(`  id: ${engine.type}`);
  if (engine.model) {
    lines.push(`  model: ${yamlString(engine.model)}`);
  }
  if (engine.maxTurns) {
    lines.push(`  max-turns: ${engine.maxTurns}`);
  }
  if (engine.version) {
    lines.push(`  version: ${yamlString(engine.version)}`);
  }
  if (hasEngineConfig) {
    for (const [key, value] of Object.entries(engine.config)) {
      lines.push(`  ${key}: ${yamlValue(value)}`);
    }
  }

  return lines;
}

function buildPermissions(state: WorkflowState): string[] {
  const entries = Object.entries(state.permissions).filter(
    ([, level]) => level && level !== 'none'
  );
  if (entries.length === 0) return [];

  const lines = ['permissions:'];
  for (const [scope, level] of entries) {
    lines.push(`  ${scope}: ${level}`);
  }
  return lines;
}

function buildTools(state: WorkflowState): string[] {
  if (state.tools.length === 0) return [];

  const lines = ['tools:'];
  for (const tool of state.tools) {
    const config = state.toolConfigs?.[tool];
    if (tool === 'bash') {
      // bash requires an explicit value: true, false, or ["cmd1","cmd2"]
      // The anonymous syntax 'bash:' (null) is not supported by the compiler.
      const cmds = config?.['allowed-commands'];
      if (typeof cmds === 'string' && cmds.trim()) {
        const cmdArray = cmds.split(',').map((c: string) => c.trim()).filter(Boolean);
        lines.push(`  bash: [${cmdArray.map((c: string) => yamlString(c)).join(', ')}]`);
      } else {
        lines.push('  bash: true');
      }
    } else if (config && Object.keys(config).length > 0) {
      lines.push(`  ${tool}:`);
      for (const [key, value] of Object.entries(config)) {
        lines.push(`    ${key}: ${yamlValue(value)}`);
      }
    } else {
      lines.push(`  ${tool}:`);
    }
  }
  return lines;
}

function buildSafeOutputs(state: WorkflowState): string[] {
  const enabledOutputs = Object.entries(state.safeOutputs).filter(
    ([, value]) => value.enabled
  );
  if (enabledOutputs.length === 0) return [];

  const lines = ['safe-outputs:'];
  for (const [key, value] of enabledOutputs) {
    const configEntries = Object.entries(value.config).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    );
    if (configEntries.length === 0) {
      lines.push(`  ${key}:`);
    } else {
      lines.push(`  ${key}:`);
      for (const [configKey, configValue] of configEntries) {
        if (Array.isArray(configValue)) {
          lines.push(`    ${configKey}: [${(configValue as string[]).join(', ')}]`);
        } else {
          lines.push(`    ${configKey}: ${yamlValue(configValue)}`);
        }
      }
    }
  }
  return lines;
}

function buildNetwork(state: WorkflowState): string[] {
  const hasAllowed = state.network.allowed.length > 0;
  const hasBlocked = state.network.blocked.length > 0;
  if (!hasAllowed && !hasBlocked) return [];

  const lines = ['network:'];
  if (hasAllowed) {
    lines.push('  allowed:');
    for (const domain of state.network.allowed) {
      lines.push(`    - ${yamlString(domain)}`);
    }
  }
  if (hasBlocked) {
    lines.push('  blocked:');
    for (const domain of state.network.blocked) {
      lines.push(`    - ${yamlString(domain)}`);
    }
  }
  return lines;
}

function buildConcurrency(state: WorkflowState): string[] {
  const { concurrency } = state;
  if (!concurrency.group && !concurrency.cancelInProgress) return [];

  const lines = ['concurrency:'];
  if (concurrency.group) {
    lines.push(`  group: ${yamlString(concurrency.group)}`);
  }
  if (concurrency.cancelInProgress) {
    lines.push('  cancel-in-progress: true');
  }
  return lines;
}

function buildRateLimit(state: WorkflowState): string[] {
  const { rateLimit } = state;
  if (!rateLimit.max && !rateLimit.window) return [];

  const lines = ['rate-limit:'];
  if (rateLimit.max) {
    lines.push(`  max: ${rateLimit.max}`);
  }
  if (rateLimit.window) {
    lines.push(`  window: ${yamlString(rateLimit.window)}`);
  }
  return lines;
}

/**
 * Convert common fuzzy schedule keywords to proper cron expressions.
 * The WASM compiler does not support fuzzy cron scattering.
 */
function resolveFuzzySchedule(schedule: string): string {
  const fuzzyMap: Record<string, string> = {
    'hourly': '0 * * * *',
    'daily': '0 0 * * *',
    'weekly': '0 0 * * MON',
    'monthly': '0 0 1 * *',
  };
  return fuzzyMap[schedule.toLowerCase()] ?? schedule;
}

/**
 * Quote a string for YAML if it contains special characters.
 */
function yamlString(value: string): string {
  if (!value) return '""';
  // If it contains special YAML chars, or starts/ends with whitespace, or
  // looks like a number/bool, wrap in quotes.
  if (
    /[:#{}[\],&*?|>!%@`'"\n]/.test(value) ||
    /^\s|\s$/.test(value) ||
    /^(true|false|null|yes|no|\d+\.?\d*)$/i.test(value)
  ) {
    return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return value;
}

function yamlValue(value: unknown): string {
  if (typeof value === 'string') return yamlString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return String(value);
}
