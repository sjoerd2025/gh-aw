import type { FC } from 'react';
import { GitHubConfig } from './GitHubConfig';
import { PlaywrightConfig } from './PlaywrightConfig';
import { CacheMemoryConfig } from './CacheMemoryConfig';
import { RepoMemoryConfig } from './RepoMemoryConfig';
import { SerenaConfig } from './SerenaConfig';
import { BashConfig } from './BashConfig';

/**
 * Map of tool names to their configuration panel components.
 * Tools not in this map have no configurable sub-fields.
 */
export const toolConfigPanels: Record<string, FC> = {
  github: GitHubConfig,
  playwright: PlaywrightConfig,
  'cache-memory': CacheMemoryConfig,
  'repo-memory': RepoMemoryConfig,
  serena: SerenaConfig,
  bash: BashConfig,
};
