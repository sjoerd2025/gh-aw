import type { WorkflowState } from '../types/workflow';

export interface LintResult {
  ruleId: string;
  severity: 'warning' | 'info';
  message: string;
  nodeId: string;
  suggestion?: string;
}

const WEB_TOOLS = ['web-search', 'web-fetch', 'playwright'];

export function lintWorkflow(state: WorkflowState): LintResult[] {
  const results: LintResult[] = [];

  const hasSafeOutputs = Object.values(state.safeOutputs).some((v) => v.enabled);
  const hasEngine = !!state.engine.type;

  // 1. Missing network config for web tools
  const enabledWebTools = state.tools.filter((t) => WEB_TOOLS.includes(t));
  if (enabledWebTools.length > 0 && state.network.allowed.length === 0) {
    results.push({
      ruleId: 'missing-network-config',
      severity: 'info',
      message: `Web tools (${enabledWebTools.join(', ')}) are enabled but no allowed domains are configured.`,
      nodeId: 'network',
      suggestion: 'Add the domains the agent needs to access under Network > Allowed Domains.',
    });
  }

  // 2. Missing timeout-minutes
  if (
    hasEngine &&
    state.timeoutMinutes === 15 &&
    state.engine.maxTurns &&
    Number(state.engine.maxTurns) > 50
  ) {
    results.push({
      ruleId: 'missing-timeout',
      severity: 'info',
      message: 'High max-turns with default timeout.',
      nodeId: 'settings',
      suggestion:
        'With max-turns > 50, the default 15-minute timeout may not be enough. Consider increasing timeout-minutes.',
    });
  }

  // 3. Missing safe outputs
  if (hasEngine && state.tools.length > 0 && !hasSafeOutputs) {
    results.push({
      ruleId: 'missing-safe-outputs',
      severity: 'info',
      message: 'Engine and tools are configured but no safe outputs are enabled.',
      nodeId: 'safeOutputs',
      suggestion:
        'Without safe outputs, the agent cannot produce visible results like comments or PRs.',
    });
  }

  return results;
}
