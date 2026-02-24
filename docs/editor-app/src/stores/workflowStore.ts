import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  WorkflowStore,
  WorkflowState,
  TriggerConfig,
  EngineConfig,
  NetworkConfig,
  ConcurrencyConfig,
  RateLimitConfig,
  PermissionScope,
  PermissionLevel,
  WorkflowTemplate,
  SafeOutputConfig,
  ValidationError,
} from '../types/workflow';
import { computeRequiredPermissions } from '../utils/smartDefaults';

const defaultTrigger: TriggerConfig = {
  event: '',
  activityTypes: [],
  branches: [],
  paths: [],
  schedule: '',
  skipRoles: [],
  skipBots: false,
  roles: [],
  bots: [],
  reaction: '',
  statusComment: false,
  manualApproval: '',
  slashCommandName: '',
};

const defaultEngine: EngineConfig = {
  type: '',
  model: '',
  maxTurns: '',
  version: '',
  config: {},
};

const defaultNetwork: NetworkConfig = {
  allowed: [],
  blocked: [],
};

const initialState: WorkflowState = {
  name: '',
  description: '',
  trigger: { ...defaultTrigger },
  permissions: {},
  autoSetPermissions: [],
  engine: { ...defaultEngine },
  tools: [],
  toolConfigs: {},
  instructions: '',
  safeOutputs: {},
  network: { ...defaultNetwork },
  timeoutMinutes: 15,
  imports: [],
  environment: {},
  cache: false,
  strict: false,
  concurrency: { group: '', cancelInProgress: false },
  rateLimit: { max: '', window: '' },
  platform: '',
  validationErrors: [],
  lintResults: [],
  errorNodeIds: [],
  selectedNodeId: null,
  highlightFieldPath: null,
  viewMode: 'visual',
  compiledYaml: '',
  compiledMarkdown: '',
  previousYaml: '',
  warnings: [],
  error: null,
  isCompiling: false,
  isReady: false,
};

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set) => ({
      ...initialState,

      setName: (name: string) => set({ name }),

      setDescription: (description: string) => set({ description }),

      setTrigger: (trigger: Partial<TriggerConfig>) =>
        set((state) => ({
          trigger: { ...state.trigger, ...trigger },
        })),

      setPermissions: (perms: Partial<Record<PermissionScope, PermissionLevel>>) =>
        set((state) => ({
          permissions: { ...state.permissions, ...perms },
          // Remove manually-changed scopes from autoSetPermissions
          autoSetPermissions: state.autoSetPermissions.filter(
            (scope) => !(scope in perms)
          ),
        })),

      setAutoSetPermissions: (scopes: string[]) => set({ autoSetPermissions: scopes }),

      setEngine: (engine: Partial<EngineConfig>) =>
        set((state) => {
          const newEngine = { ...state.engine, ...engine };
          const required = computeRequiredPermissions(state.tools, state.safeOutputs, newEngine.type);
          const newPerms = { ...state.permissions };
          const newAutoSet = [...state.autoSetPermissions];

          for (const [scope, level] of Object.entries(required) as [PermissionScope, PermissionLevel][]) {
            // Only auto-set if not manually overridden
            if (newAutoSet.includes(scope) || !(scope in state.permissions)) {
              newPerms[scope] = level;
              if (!newAutoSet.includes(scope)) newAutoSet.push(scope);
            }
          }

          return { engine: newEngine, permissions: newPerms, autoSetPermissions: newAutoSet };
        }),

      toggleTool: (tool: string) =>
        set((state) => {
          const newTools = state.tools.includes(tool)
            ? state.tools.filter((t) => t !== tool)
            : [...state.tools, tool];
          const required = computeRequiredPermissions(newTools, state.safeOutputs, state.engine.type);
          const newPerms = { ...state.permissions };
          const newAutoSet = [...state.autoSetPermissions];

          for (const [scope, level] of Object.entries(required) as [PermissionScope, PermissionLevel][]) {
            if (newAutoSet.includes(scope) || !(scope in state.permissions)) {
              newPerms[scope] = level;
              if (!newAutoSet.includes(scope)) newAutoSet.push(scope);
            }
          }

          return { tools: newTools, permissions: newPerms, autoSetPermissions: newAutoSet };
        }),

      setToolConfig: (tool: string, config: Record<string, unknown>) =>
        set((state) => ({
          toolConfigs: { ...state.toolConfigs, [tool]: config },
        })),

      setInstructions: (instructions: string) => set({ instructions }),

      toggleSafeOutput: (key: string) =>
        set((state) => {
          const current = state.safeOutputs[key];
          const next = { ...state.safeOutputs };
          if (current?.enabled) {
            delete next[key];
          } else {
            next[key] = { enabled: true, config: current?.config ?? {} };
          }

          const required = computeRequiredPermissions(state.tools, next, state.engine.type);
          const newPerms = { ...state.permissions };
          const newAutoSet = [...state.autoSetPermissions];

          for (const [scope, level] of Object.entries(required) as [PermissionScope, PermissionLevel][]) {
            if (newAutoSet.includes(scope) || !(scope in state.permissions)) {
              newPerms[scope] = level;
              if (!newAutoSet.includes(scope)) newAutoSet.push(scope);
            }
          }

          return { safeOutputs: next, permissions: newPerms, autoSetPermissions: newAutoSet };
        }),

      setSafeOutputConfig: (key: string, config: Record<string, unknown>) =>
        set((state) => ({
          safeOutputs: {
            ...state.safeOutputs,
            [key]: {
              enabled: state.safeOutputs[key]?.enabled ?? true,
              config,
            },
          },
        })),

      setNetwork: (network: Partial<NetworkConfig>) =>
        set((state) => ({
          network: { ...state.network, ...network },
        })),

      addAllowedDomain: (domain: string) =>
        set((state) => ({
          network: {
            ...state.network,
            allowed: state.network.allowed.includes(domain)
              ? state.network.allowed
              : [...state.network.allowed, domain],
          },
        })),

      removeAllowedDomain: (domain: string) =>
        set((state) => ({
          network: {
            ...state.network,
            allowed: state.network.allowed.filter((d) => d !== domain),
          },
        })),

      addBlockedDomain: (domain: string) =>
        set((state) => ({
          network: {
            ...state.network,
            blocked: state.network.blocked.includes(domain)
              ? state.network.blocked
              : [...state.network.blocked, domain],
          },
        })),

      removeBlockedDomain: (domain: string) =>
        set((state) => ({
          network: {
            ...state.network,
            blocked: state.network.blocked.filter((d) => d !== domain),
          },
        })),

      setConcurrency: (concurrency: Partial<ConcurrencyConfig>) =>
        set((state) => ({
          concurrency: { ...state.concurrency, ...concurrency },
        })),

      setRateLimit: (rateLimit: Partial<RateLimitConfig>) =>
        set((state) => ({
          rateLimit: { ...state.rateLimit, ...rateLimit },
        })),

      addImport: (path: string) =>
        set((state) => ({
          imports: state.imports.includes(path)
            ? state.imports
            : [...state.imports, path],
        })),

      removeImport: (path: string) =>
        set((state) => ({
          imports: state.imports.filter((p) => p !== path),
        })),

      setPlatform: (platform: string) => set({ platform }),

      selectNode: (id: string | null) => set({ selectedNodeId: id }),

      setHighlightFieldPath: (path: string | null) => set({ highlightFieldPath: path }),

      setViewMode: (mode: 'visual' | 'markdown' | 'yaml') => set({ viewMode: mode }),

      setCompiledYaml: (compiledYaml: string) =>
        set((state) => ({
          previousYaml: state.compiledYaml,
          compiledYaml,
        })),

      setCompiledMarkdown: (compiledMarkdown: string) => set({ compiledMarkdown }),

      setWarnings: (warnings: string[]) => set({ warnings }),

      setError: (error) => set({ error }),

      setValidationErrors: (validationErrors: ValidationError[]) => set({ validationErrors }),

      setLintResults: (lintResults) => set({ lintResults }),

      setErrorNodeIds: (errorNodeIds: string[]) => set({ errorNodeIds }),

      setIsCompiling: (isCompiling: boolean) => set({ isCompiling }),

      setIsReady: (isReady: boolean) => set({ isReady }),

      loadTemplate: (template: WorkflowTemplate) =>
        set({
          // Workflow data
          name: template.name.toLowerCase().replace(/\s+/g, '-'),
          description: template.description,
          trigger: {
            ...defaultTrigger,
            ...template.trigger,
          },
          engine: {
            ...defaultEngine,
            ...template.engine,
          },
          permissions: template.permissions,
          autoSetPermissions: [],
          tools: template.tools,
          toolConfigs: {},
          instructions: template.instructions,
          safeOutputs: Object.fromEntries(
            Object.entries(template.safeOutputs).map(([key, value]) => [
              key,
              {
                enabled: true,
                config: typeof value === 'object' && value !== null ? value as Record<string, unknown> : {},
              } satisfies SafeOutputConfig,
            ])
          ),
          network: {
            ...defaultNetwork,
            ...template.network,
          },
          // Reset advanced fields to defaults
          timeoutMinutes: 15,
          imports: [],
          environment: {},
          cache: false,
          strict: false,
          concurrency: { group: '', cancelInProgress: false },
          rateLimit: { max: '', window: '' },
          platform: '',
          // Reset UI/compilation state
          selectedNodeId: null,
          highlightFieldPath: null,
          error: null,
          warnings: [],
          validationErrors: [],
          errorNodeIds: [],
          compiledYaml: '',
          compiledMarkdown: '',
        }),

      loadState: (partial: Partial<WorkflowState>) =>
        set((state) => ({
          ...state,
          ...partial,
          // Merge nested objects rather than replacing
          trigger: partial.trigger ? { ...state.trigger, ...partial.trigger } : state.trigger,
          engine: partial.engine ? { ...state.engine, ...partial.engine } : state.engine,
          network: partial.network ? { ...state.network, ...partial.network } : state.network,
          selectedNodeId: null,
          highlightFieldPath: null,
          error: null,
          warnings: [],
        })),

      reset: () => set({ ...initialState }),
    }),
    {
      name: 'workflow-editor-state',
      partialize: (state) => ({
        name: state.name,
        description: state.description,
        trigger: state.trigger,
        permissions: state.permissions,
        engine: state.engine,
        tools: state.tools,
        toolConfigs: state.toolConfigs,
        instructions: state.instructions,
        safeOutputs: state.safeOutputs,
        network: state.network,
        timeoutMinutes: state.timeoutMinutes,
        imports: state.imports,
        environment: state.environment,
        cache: state.cache,
        strict: state.strict,
        concurrency: state.concurrency,
        rateLimit: state.rateLimit,
        platform: state.platform,
      }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Partial<WorkflowStore>),
        // Ensure new fields always have safe defaults even if missing from old localStorage
        validationErrors: (persisted as Partial<WorkflowState>)?.validationErrors ?? initialState.validationErrors,
        lintResults: (persisted as Partial<WorkflowState>)?.lintResults ?? initialState.lintResults,
        errorNodeIds: (persisted as Partial<WorkflowState>)?.errorNodeIds ?? initialState.errorNodeIds,
        concurrency: (persisted as Partial<WorkflowState>)?.concurrency ?? initialState.concurrency,
        rateLimit: (persisted as Partial<WorkflowState>)?.rateLimit ?? initialState.rateLimit,
        platform: (persisted as Partial<WorkflowState>)?.platform ?? initialState.platform,
        previousYaml: (persisted as Partial<WorkflowState>)?.previousYaml ?? initialState.previousYaml,
      }),
    }
  )
);
