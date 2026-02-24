import type { CompileResult } from '../types/workflow';
import type { WorkerCompiler, ValidationResult } from '../types/compiler';

// Declare the module for the external JS loader
declare function createWorkerCompiler(options?: {
  workerUrl?: string;
}): WorkerCompiler;

let compiler: WorkerCompiler | null = null;

/**
 * Initialize the WASM compiler by loading the web worker.
 * The wasmBasePath should point to the directory containing
 * compiler-loader.js, compiler-worker.js, wasm_exec.js, and gh-aw.wasm.
 */
export async function initCompiler(wasmBasePath: string): Promise<void> {
  if (compiler) return;

  // Dynamically import the compiler loader module
  const loaderModule = await import(
    /* @vite-ignore */ `${wasmBasePath}compiler-loader.js`
  );
  const factory = loaderModule.createWorkerCompiler || loaderModule.default?.createWorkerCompiler;

  if (!factory) {
    throw new Error('createWorkerCompiler not found in compiler-loader.js');
  }

  const instance = factory({
    workerUrl: `${wasmBasePath}compiler-worker.js`,
  });

  await instance.ready;
  compiler = instance;
}

/**
 * Compile a markdown workflow string to GitHub Actions YAML.
 * Optionally pass a files map for import resolution.
 */
export async function compile(markdown: string, files?: Record<string, string>): Promise<CompileResult> {
  if (!compiler) {
    throw new Error('Compiler not initialized. Call initCompiler() first.');
  }

  const result = await compiler.compile(markdown, files);
  return {
    yaml: result.yaml,
    warnings: result.warnings,
    error: result.error,
  };
}

/**
 * Validate a markdown workflow string using the WASM compiler with schema validation enabled.
 * Returns structured errors rather than compiled output.
 */
export async function validate(markdown: string): Promise<ValidationResult> {
  if (!compiler) {
    throw new Error('Compiler not initialized. Call initCompiler() first.');
  }

  return compiler.validate(markdown);
}

/**
 * Check if the compiler has been initialized.
 */
export function isCompilerReady(): boolean {
  return compiler !== null;
}

/**
 * Terminate the compiler worker.
 */
export function terminateCompiler(): void {
  if (compiler) {
    compiler.terminate();
    compiler = null;
  }
}
