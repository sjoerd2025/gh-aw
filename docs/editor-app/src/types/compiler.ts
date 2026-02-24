// WASM compiler message types

import type { CompilerError } from './workflow';

export interface CompileRequest {
  type: 'compile';
  id: number;
  markdown: string;
  files?: Record<string, string>;
}

export interface ValidateRequest {
  type: 'validate';
  id: number;
  markdown: string;
  files?: Record<string, string>;
}

export interface CompileResultMessage {
  type: 'result';
  id: number;
  yaml: string;
  warnings: string[];
  error: CompilerError | null;
}

export interface ValidateResultMessage {
  type: 'validate_result';
  id: number;
  errors: ValidationError[];
  warnings: string[];
}

export interface CompileErrorMessage {
  type: 'error';
  id: number | null;
  error: string;
}

export interface ReadyMessage {
  type: 'ready';
}

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  errors: ValidationError[];
  warnings: string[];
}

export type WorkerMessage =
  | CompileResultMessage
  | ValidateResultMessage
  | CompileErrorMessage
  | ReadyMessage;

export interface WorkerCompiler {
  compile: (markdown: string, files?: Record<string, string>) => Promise<{
    yaml: string;
    warnings: string[];
    error: CompilerError | null;
  }>;
  validate: (markdown: string, files?: Record<string, string>) => Promise<ValidationResult>;
  ready: Promise<void>;
  terminate: () => void;
}
