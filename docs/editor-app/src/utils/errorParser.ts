import type { CompilerError } from '../types/workflow';

export interface ParsedError {
  nodeId: string | null;
  fieldPath: string | null;
  label: string;
  detail: string;
  suggestion?: string;
  docsUrl?: string | null;
  line?: number | null;
}

/** Maps frontmatter field names from the compiler to editor node IDs */
const fieldToNodeId: Record<string, string> = {
  engine: 'engine',
  model: 'engine',
  on: 'trigger',
  permissions: 'permissions',
  'safe-outputs': 'safeOutputs',
  tools: 'tools',
  'mcp-servers': 'tools',
  network: 'network',
  'allow-domains': 'network',
  imports: 'instructions',
  instructions: 'instructions',
  frontmatter: 'trigger',
};

const nodePatterns: [RegExp, string][] = [
  [/\btrigger\b/i, 'trigger'],
  [/\bengine\b/i, 'engine'],
  [/\bsafe[_-]?output/i, 'safeOutputs'],
  [/\btool/i, 'tools'],
  [/\bnetwork\b/i, 'network'],
  [/\binstruction/i, 'instructions'],
  // permissions last — remapped below, never navigates to a dead 'permissions' node
  [/\bpermission/i, 'permissions'],
];

/**
 * Remap a 'permissions' nodeId to the block that actually needs the permission.
 * The permissions block was removed from visual mode, so clicking "Permissions"
 * would navigate nowhere. Instead, send the user to the relevant tool or
 * safe-output block.
 */
function remapPermissionsNode(error: string): { nodeId: string | null; suggestion?: string } {
  const lower = error.toLowerCase();

  // If error mentions a safe-output action that needs permissions
  if (/\b(create[_-]issue|add[_-]comment|create[_-]pull[_-]request|push[_-]to|close[_-]|update[_-]|add[_-]label|remove[_-]label|assign|review|dispatch|upload)/i.test(lower)) {
    return { nodeId: 'safeOutputs', suggestion: 'Check your safe outputs — they require matching permissions.' };
  }

  // If error mentions a tool that needs permissions
  if (/\b(github|bash|edit|playwright|web[_-]fetch|web[_-]search)\b/i.test(lower)) {
    return { nodeId: 'tools', suggestion: 'Check your tools — they may require additional permissions.' };
  }

  // If error mentions contents/issues/pull-requests scope → likely safe-outputs
  if (/\b(contents|issues|pull[_-]requests|discussions|id[_-]token)\b/.test(lower)) {
    return { nodeId: 'safeOutputs', suggestion: 'Permissions are auto-managed. Check your safe outputs to ensure the right scopes are granted.' };
  }

  // Generic permissions error — no clear remap, show inline only
  return { nodeId: null, suggestion: 'Permissions are auto-managed based on your tools and safe outputs. Adjust those to change permissions.' };
}

/**
 * Parse a compiler error (structured or string) into a display-friendly format.
 * When a structured CompilerError is provided, uses its fields directly.
 * Falls back to regex matching for plain string errors.
 */
export function parseCompilerError(error: CompilerError | string): ParsedError {
  // Handle structured CompilerError objects
  if (typeof error === 'object' && error !== null) {
    const msg = error.message || '';

    // Use the structured field to determine the node
    let nodeId: string | null = null;
    let suggestion = error.suggestion ?? undefined;

    if (error.field) {
      nodeId = fieldToNodeId[error.field] ?? null;

      // Remap permissions to a valid block (permissions node was removed)
      if (nodeId === 'permissions') {
        const remap = remapPermissionsNode(msg);
        nodeId = remap.nodeId;
        suggestion = suggestion || remap.suggestion;
      }
    }

    // If structured field didn't give us a node, fall back to regex
    if (!nodeId) {
      for (const [pattern, nid] of nodePatterns) {
        if (pattern.test(msg)) {
          if (nid === 'permissions') {
            const remap = remapPermissionsNode(msg);
            nodeId = remap.nodeId;
            suggestion = suggestion || remap.suggestion;
          } else {
            nodeId = nid;
          }
          break;
        }
      }
    }

    const label = nodeId ? `Error in ${nodeId}` : 'Compilation error';

    return {
      nodeId,
      fieldPath: error.field ?? null,
      label,
      detail: msg,
      suggestion,
      docsUrl: error.docsUrl,
      line: error.line,
    };
  }

  // Fallback: plain string error (legacy path)
  for (const [pattern, nodeId] of nodePatterns) {
    if (pattern.test(error)) {
      // Remap permissions to a valid block
      if (nodeId === 'permissions') {
        const remap = remapPermissionsNode(error);
        return {
          nodeId: remap.nodeId,
          fieldPath: null,
          label: 'Permissions',
          detail: error,
          suggestion: remap.suggestion,
        };
      }
      return {
        nodeId,
        fieldPath: null,
        label: `Error in ${nodeId}`,
        detail: error,
      };
    }
  }
  return {
    nodeId: null,
    fieldPath: null,
    label: 'Compilation error',
    detail: error,
  };
}

/**
 * Extract node IDs from an error and warnings list.
 * Accepts CompilerError objects or plain strings for backwards compatibility.
 */
export function extractErrorNodeIds(error: CompilerError | string | null, warnings: string[]): string[] {
  const ids = new Set<string>();

  if (error) {
    const parsed = parseCompilerError(error);
    if (parsed.nodeId) {
      ids.add(parsed.nodeId);
    }
  }

  for (const warning of warnings) {
    const parsed = parseCompilerError(warning);
    if (parsed.nodeId) {
      ids.add(parsed.nodeId);
    }
  }

  return Array.from(ids);
}

/**
 * Get the display message from a CompilerError or string.
 */
export function getErrorMessage(error: CompilerError | string | null): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  return error.message || '';
}
