import { useEffect, useCallback } from 'react';
import { useWorkflowStore } from '../stores/workflowStore';
import { initCompiler, compile, isCompilerReady } from '../utils/compiler';

/**
 * Hook to manage the WASM compiler lifecycle.
 * Initializes the compiler on mount and provides a compile function.
 */
export function useCompiler() {
  const setIsReady = useWorkflowStore((s) => s.setIsReady);
  const setIsCompiling = useWorkflowStore((s) => s.setIsCompiling);
  const setCompiledYaml = useWorkflowStore((s) => s.setCompiledYaml);
  const setWarnings = useWorkflowStore((s) => s.setWarnings);
  const setError = useWorkflowStore((s) => s.setError);

  useEffect(() => {
    const basePath = import.meta.env.BASE_URL + 'wasm/';
    initCompiler(basePath)
      .then(() => setIsReady(true))
      .catch((err) => {
        console.error('Failed to initialize compiler:', err);
        setError({ message: `Compiler failed to load: ${err.message}`, severity: 'error' });
      });
  }, [setIsReady, setError]);

  const compileMarkdown = useCallback(
    async (markdown: string) => {
      if (!isCompilerReady()) return;

      setIsCompiling(true);
      setError(null);

      try {
        const result = await compile(markdown);
        setCompiledYaml(result.yaml);
        setWarnings(result.warnings);
        setError(result.error);
      } catch (err) {
        setError({ message: err instanceof Error ? err.message : 'Compilation failed', severity: 'error' });
      } finally {
        setIsCompiling(false);
      }
    },
    [setIsCompiling, setCompiledYaml, setWarnings, setError]
  );

  return { compileMarkdown, isReady: isCompilerReady() };
}
