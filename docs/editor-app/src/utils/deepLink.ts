import type { WorkflowState } from '../types/workflow';

const SERIALIZED_KEYS = [
  'name', 'description', 'trigger', 'permissions', 'engine',
  'tools', 'instructions', 'safeOutputs', 'network',
  'timeoutMinutes', 'imports', 'environment', 'cache', 'strict',
] as const;

export function encodeState(state: WorkflowState): string {
  const data: Record<string, unknown> = {};
  for (const key of SERIALIZED_KEYS) {
    data[key] = state[key];
  }
  const json = JSON.stringify(data);
  const encoded = btoa(unescape(encodeURIComponent(json)));
  return encoded;
}

export function decodeState(hash: string): Partial<WorkflowState> | null {
  try {
    const json = decodeURIComponent(escape(atob(hash)));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function parseHash(): { mode: 'b64' | 'url' | null; value: string } {
  const hash = window.location.hash.slice(1); // remove #
  if (hash.startsWith('b64=')) return { mode: 'b64', value: hash.slice(4) };
  if (hash.startsWith('url=')) return { mode: 'url', value: decodeURIComponent(hash.slice(4)) };
  return { mode: null, value: '' };
}

export function setHashState(state: WorkflowState): void {
  const encoded = encodeState(state);
  const newHash = `#b64=${encoded}`;
  // Only update if URL wouldn't be too long
  if (newHash.length <= 2000) {
    history.replaceState(null, '', newHash);
  }
}
