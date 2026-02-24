import { useEffect, useRef } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { generateMarkdown } from '../utils/markdownGenerator';
import { compile, isCompilerReady } from '../utils/compiler';
import { extractErrorNodeIds } from '../utils/errorParser';
import { validateWorkflow } from '../utils/validation';
import { lintWorkflow } from '../utils/linter';
import { buildImportFilesMap } from '../utils/sharedComponents';

/**
 * Auto-compile hook that subscribes to workflow store changes,
 * debounces by 400ms, generates markdown, and compiles via WASM.
 * Also runs client-side validation immediately on state change.
 */
export function useAutoCompile() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Subscribe to all state changes that affect the workflow output
    const unsubscribe = useWorkflowStore.subscribe((state, prevState) => {
      // Only recompile when workflow data changes (not UI state)
      const stateChanged =
        state.name !== prevState.name ||
        state.description !== prevState.description ||
        state.trigger !== prevState.trigger ||
        state.permissions !== prevState.permissions ||
        state.engine !== prevState.engine ||
        state.tools !== prevState.tools ||
        state.toolConfigs !== prevState.toolConfigs ||
        state.instructions !== prevState.instructions ||
        state.safeOutputs !== prevState.safeOutputs ||
        state.network !== prevState.network ||
        state.timeoutMinutes !== prevState.timeoutMinutes ||
        state.imports !== prevState.imports ||
        state.environment !== prevState.environment ||
        state.cache !== prevState.cache ||
        state.strict !== prevState.strict ||
        state.concurrency !== prevState.concurrency ||
        state.rateLimit !== prevState.rateLimit ||
        state.platform !== prevState.platform;

      if (!stateChanged) return;

      // Run client-side validation and linting immediately (no debounce)
      const validationErrors = validateWorkflow(state);
      state.setValidationErrors(validationErrors);

      const lintResults = lintWorkflow(state);
      state.setLintResults(lintResults);

      // Merge validation error node IDs with compiler error node IDs
      const validationNodeIds = [...new Set(validationErrors.map((e) => e.nodeId))];
      const compilerNodeIds = extractErrorNodeIds(state.error, state.warnings);
      const allNodeIds = [...new Set([...validationNodeIds, ...compilerNodeIds])];
      state.setErrorNodeIds(allNodeIds);

      // Clear any pending debounce
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }

      // Debounce 400ms
      timerRef.current = setTimeout(() => {
        const currentState = useWorkflowStore.getState();
        const markdown = generateMarkdown(currentState);

        // Update compiled markdown immediately
        currentState.setCompiledMarkdown(markdown);

        // Only compile via WASM if the compiler is ready
        if (!isCompilerReady()) return;

        currentState.setIsCompiling(true);

        // Build import files map for WASM compiler
        const files = currentState.imports.length > 0
          ? buildImportFilesMap(currentState.imports)
          : undefined;

        compile(markdown, files)
          .then((result) => {
            const store = useWorkflowStore.getState();
            store.setCompiledYaml(result.yaml);
            store.setWarnings(result.warnings);
            store.setError(result.error);
            // Merge compiler errors with current validation errors
            const compilerIds = extractErrorNodeIds(result.error, result.warnings);
            const valIds = [...new Set(store.validationErrors.map((e) => e.nodeId))];
            store.setErrorNodeIds([...new Set([...compilerIds, ...valIds])]);
            store.setIsCompiling(false);
          })
          .catch((err) => {
            const store = useWorkflowStore.getState();
            const errorMsg = err instanceof Error ? err.message : String(err);
            const errorObj = { message: errorMsg, severity: 'error' as const };
            store.setError(errorObj);
            const compilerIds = extractErrorNodeIds(errorObj, []);
            const valIds = [...new Set(store.validationErrors.map((e) => e.nodeId))];
            store.setErrorNodeIds([...new Set([...compilerIds, ...valIds])]);
            store.setIsCompiling(false);
          });
      }, 400);
    });

    return () => {
      unsubscribe();
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);
}
