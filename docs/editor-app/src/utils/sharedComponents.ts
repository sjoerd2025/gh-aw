export interface SharedComponent {
  path: string;
  name: string;
  description: string;
  provides: string[];
  mockContent: string;
}

export const sharedComponents: SharedComponent[] = [
  {
    path: 'shared/tools/code-review.md',
    name: 'Code Review Tools',
    description: 'Standard tools for reviewing PRs',
    provides: ['tools', 'permissions'],
    mockContent: [
      '---',
      'tools:',
      '  github:',
      '  bash:',
      'permissions:',
      '  pull-requests: write',
      '  contents: read',
      '---',
      '',
      'Review pull requests using GitHub and bash tools.',
    ].join('\n'),
  },
  {
    path: 'shared/tools/web-browsing.md',
    name: 'Web Browsing Tools',
    description: 'Playwright + web-fetch + web-search',
    provides: ['tools', 'network'],
    mockContent: [
      '---',
      'tools:',
      '  playwright:',
      '  web-fetch:',
      '  web-search:',
      'network:',
      '  allowed:',
      '    - "*.github.com"',
      '---',
      '',
      'Browse the web with Playwright, fetch pages, and search.',
    ].join('\n'),
  },
  {
    path: 'shared/security/standard.md',
    name: 'Security Defaults',
    description: 'Standard security permissions and network config',
    provides: ['permissions', 'network'],
    mockContent: [
      '---',
      'permissions:',
      '  contents: read',
      '  metadata: read',
      'network:',
      '  allowed:',
      '    - api.github.com',
      '    - github.com',
      '---',
      '',
      'Standard security defaults for agentic workflows.',
    ].join('\n'),
  },
];

/** Cache for fetched remote component content (URL → raw markdown) */
const remoteContentCache = new Map<string, string>();

/** Check if an import path is a remote URL */
export function isRemoteImport(path: string): boolean {
  return path.startsWith('http://') || path.startsWith('https://');
}

/** Extract a short display name from a remote URL (just the filename) */
export function remoteImportLabel(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const filename = pathname.split('/').filter(Boolean).pop();
    return filename ?? url;
  } catch {
    return url;
  }
}

/** Fetch raw content from a remote URL and cache it. Throws on failure. */
export async function fetchRemoteComponent(url: string): Promise<string> {
  const cached = remoteContentCache.get(url);
  if (cached !== undefined) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  const text = await res.text();
  remoteContentCache.set(url, text);
  return text;
}

/** Remove a remote URL from the cache */
export function clearRemoteCache(url: string): void {
  remoteContentCache.delete(url);
}

/** Build a files map for the WASM compiler from import paths */
export function buildImportFilesMap(
  imports: string[],
): Record<string, string> {
  const files: Record<string, string> = {};
  for (const importPath of imports) {
    if (isRemoteImport(importPath)) {
      const cached = remoteContentCache.get(importPath);
      if (cached) {
        files[importPath] = cached;
      }
    } else {
      const component = sharedComponents.find((c) => c.path === importPath);
      if (component) {
        files[importPath] = component.mockContent;
      }
    }
  }
  return files;
}
