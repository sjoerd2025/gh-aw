import type { WorkflowState } from '../types/workflow';

export interface ValidationError {
  field: string;      // dot-path like "trigger.schedule", "engine.type"
  nodeId: string;     // which node this belongs to
  message: string;
  severity: 'error' | 'warning';
}

const VALID_NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/;

// Cron: 5 fields separated by spaces, each field is a number/star/range/step/comma-separated
const CRON_FIELD_RE = /^(\*|[0-9]+(-[0-9]+)?(\/[0-9]+)?)(,(\*|[0-9]+(-[0-9]+)?(\/[0-9]+)?))*$/;
const SCHEDULE_PRESETS = ['daily', 'hourly', 'weekly', 'monthly', 'yearly'];

const DOMAIN_RE = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*$/;

function isValidCron(s: string): boolean {
  const parts = s.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return parts.every((p) => CRON_FIELD_RE.test(p));
}

// Keywords accepted by the compiler as network domain values
// Includes ecosystem identifiers required by strict mode
const DOMAIN_KEYWORDS = [
  'defaults', 'all', 'none',
  'python', 'node', 'go', 'rust', 'ruby', 'java', 'docker',
  'dotnet', 'elixir', 'haskell', 'swift', 'php', 'perl',
];

function isValidDomain(d: string): boolean {
  if (DOMAIN_KEYWORDS.includes(d.toLowerCase())) return true;
  if (d.startsWith('http://') || d.startsWith('https://')) return false;
  if (d.includes('/')) return false;
  return DOMAIN_RE.test(d);
}

export function validateWorkflow(state: WorkflowState): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Name validation
  if (!state.name.trim()) {
    errors.push({
      field: 'name',
      nodeId: 'steps',
      message: 'Workflow name is required.',
      severity: 'error',
    });
  } else if (!VALID_NAME_RE.test(state.name)) {
    errors.push({
      field: 'name',
      nodeId: 'steps',
      message: 'Name must start with a letter or number and contain only alphanumeric characters, hyphens, or underscores.',
      severity: 'error',
    });
  }

  // 2. Engine type required when tools or safe outputs are configured
  const hasTools = state.tools.length > 0;
  const hasSafeOutputs = Object.values(state.safeOutputs).some((v) => v.enabled);
  if ((hasTools || hasSafeOutputs) && !state.engine.type) {
    errors.push({
      field: 'engine.type',
      nodeId: 'engine',
      message: 'An AI engine must be selected when tools or safe outputs are configured.',
      severity: 'error',
    });
  }

  // 3. Trigger event required
  if (!state.trigger.event) {
    errors.push({
      field: 'trigger.event',
      nodeId: 'trigger',
      message: 'A trigger event is required.',
      severity: 'error',
    });
  }

  // 4. Schedule cron validation
  if (state.trigger.event === 'schedule' && state.trigger.schedule) {
    const schedule = state.trigger.schedule.trim();
    if (!SCHEDULE_PRESETS.includes(schedule.toLowerCase()) && !isValidCron(schedule)) {
      errors.push({
        field: 'trigger.schedule',
        nodeId: 'trigger',
        message: 'Invalid cron expression. Use 5-field cron syntax (e.g. "0 0 * * *") or a preset (daily, hourly, weekly).',
        severity: 'error',
      });
    }
  }

  // 5. Mutual exclusivity: branches vs branches-ignore not checked here (removed id-token validation — permissions are auto-set)
  //    (branches-ignore is not in the current TriggerConfig — would apply if added)

  // 7. Safe outputs require at least one tool enabled
  if (hasSafeOutputs && !hasTools) {
    errors.push({
      field: 'safeOutputs',
      nodeId: 'safeOutputs',
      message: 'Safe outputs require at least one tool to be enabled.',
      severity: 'warning',
    });
  }

  // 8. Network domain format validation
  for (const domain of state.network.allowed) {
    if (!isValidDomain(domain)) {
      errors.push({
        field: 'network.allowed',
        nodeId: 'network',
        message: `Invalid domain "${domain}". Use a bare domain (no protocol or path).`,
        severity: 'error',
      });
    }
  }
  for (const domain of state.network.blocked) {
    if (!isValidDomain(domain)) {
      errors.push({
        field: 'network.blocked',
        nodeId: 'network',
        message: `Invalid domain "${domain}". Use a bare domain (no protocol or path).`,
        severity: 'error',
      });
    }
  }

  return errors;
}

/** Get validation errors filtered for a specific nodeId */
export function getErrorsForNode(errors: ValidationError[], nodeId: string): ValidationError[] {
  return errors.filter((e) => e.nodeId === nodeId);
}

/** Get validation errors filtered for a specific field path */
export function getErrorsForField(errors: ValidationError[], field: string): ValidationError[] {
  return errors.filter((e) => e.field === field);
}
