import { memo, type ReactNode } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { LintBadge } from '../shared/LintBadge';
import '../../styles/nodes.css';

interface BaseNodeProps {
  type: string;
  icon: ReactNode;
  title: string;
  selected?: boolean;
  dimmed?: boolean;
  children: ReactNode;
}

export const BaseNode = memo(function BaseNode({
  type,
  icon,
  title,
  selected = false,
  dimmed = false,
  children,
}: BaseNodeProps) {
  const errorNodeIds = useWorkflowStore((s) => s.errorNodeIds) ?? [];
  const validationErrors = useWorkflowStore((s) => s.validationErrors) ?? [];
  const lintResults = useWorkflowStore((s) => s.lintResults) ?? [];
  const hasError = errorNodeIds.includes(type);
  const errorCount = validationErrors.filter((e) => e.nodeId === type).length;
  const lintCount = lintResults.filter((l) => l.nodeId === type).length;

  const classes = [
    'workflow-node',
    `node-${type}`,
    selected ? 'selected' : '',
    dimmed ? 'dimmed' : '',
    hasError ? 'has-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div className={classes} data-tour-target={type}>
        <div className="workflow-node__header">
          <div className="workflow-node__icon">{icon}</div>
          <div className="workflow-node__title">{title}</div>
          {errorCount > 0 && (
            <span style={errorBadgeStyle}>
              {errorCount}
            </span>
          )}
          {errorCount === 0 && <LintBadge count={lintCount} />}
        </div>
        <div className="workflow-node__divider" />
        <div className="workflow-node__content">{children}</div>
      </div>
      <Handle type="source" position={Position.Bottom} />
    </>
  );
});

const errorBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '18px',
  height: '18px',
  padding: '0 5px',
  borderRadius: '9px',
  fontSize: '11px',
  fontWeight: 600,
  color: '#ffffff',
  backgroundColor: '#cf222e',
  marginLeft: 'auto',
  flexShrink: 0,
};
