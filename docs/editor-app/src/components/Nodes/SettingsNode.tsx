import { memo } from 'react';
import { Settings } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { useWorkflowStore } from '../../stores/workflowStore';
import type { WorkflowNodeData } from '../../types/nodes';

interface SettingsNodeProps {
  data: WorkflowNodeData;
  selected: boolean;
}

export const SettingsNode = memo(function SettingsNode({ data, selected }: SettingsNodeProps) {
  const concurrency = useWorkflowStore((s) => s.concurrency) ?? { group: '', cancelInProgress: false };
  const rateLimit = useWorkflowStore((s) => s.rateLimit) ?? { max: '', window: '' };
  const platform = useWorkflowStore((s) => s.platform) ?? '';
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const dimmed = selectedNodeId !== null && !selected;

  const items: string[] = [];
  if (platform) items.push(platform);
  if (concurrency.group) items.push('Concurrency group set');
  if (rateLimit.max) items.push(`Rate limit: ${rateLimit.max}/${rateLimit.window || '?'}`);

  return (
    <BaseNode
      type="settings"
      icon={<Settings size={18} />}
      title={data.label}
      selected={selected}
      dimmed={dimmed}
    >
      {items.length > 0 ? (
        items.map((item, i) => <div key={i}>{item}</div>)
      ) : (
        <span className="workflow-node__cta">Click to configure settings</span>
      )}
    </BaseNode>
  );
});
