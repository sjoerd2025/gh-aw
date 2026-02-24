// React Flow node type definitions

export type WorkflowNodeType =
  | 'trigger'
  | 'permissions'
  | 'engine'
  | 'tools'
  | 'instructions'
  | 'safeOutputs'
  | 'network'
  | 'settings'
  | 'steps';

export interface WorkflowNodeData extends Record<string, unknown> {
  label: string;
  type: WorkflowNodeType;
  description: string;
  isConfigured: boolean;
  itemCount?: number;
}
