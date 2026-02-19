import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import type { SafeOutputKey } from '../../types/workflow';

interface OutputCategory {
  name: string;
  items: SafeOutputKey[];
}

const categories: OutputCategory[] = [
  {
    name: 'Comments',
    items: [
      'add-comment',
      'create-pull-request-review-comment',
      'reply-to-pull-request-review-comment',
      'resolve-pull-request-review-thread',
      'hide-comment',
    ],
  },
  {
    name: 'Issues',
    items: [
      'create-issue',
      'close-issue',
      'update-issue',
      'assign-to-user',
      'assign-to-agent',
      'unassign-from-user',
      'assign-milestone',
      'link-sub-issue',
    ],
  },
  {
    name: 'Pull Requests',
    items: [
      'create-pull-request',
      'close-pull-request',
      'update-pull-request',
      'submit-pull-request-review',
      'push-to-pull-request-branch',
      'mark-pull-request-as-ready-for-review',
      'add-reviewer',
    ],
  },
  {
    name: 'Labels',
    items: ['add-labels', 'remove-labels'],
  },
  {
    name: 'Projects',
    items: [
      'create-project',
      'update-project',
      'create-project-status-update',
    ],
  },
  {
    name: 'Discussions',
    items: ['create-discussion', 'close-discussion', 'update-discussion'],
  },
  {
    name: 'Other',
    items: [
      'dispatch-workflow',
      'upload-asset',
      'update-release',
      'create-code-scanning-alert',
      'autofix-code-scanning-alert',
      'create-agent-task',
      'create-agent-session',
      'missing-tool',
      'missing-data',
      'noop',
      'threat-detection',
    ],
  },
];

export function SafeOutputsPanel() {
  const safeOutputs = useWorkflowStore((s) => s.safeOutputs);
  const toggleSafeOutput = useWorkflowStore((s) => s.toggleSafeOutput);
  const desc = getFieldDescription('safe-outputs');

  const enabledCount = Object.values(safeOutputs).filter((v) => v.enabled).length;

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      <div style={summaryStyle}>
        {enabledCount} action{enabledCount !== 1 ? 's' : ''} enabled
      </div>

      {categories.map((cat) => (
        <div key={cat.name} className="panel__section">
          <div className="panel__section-title">{cat.name}</div>
          {cat.items.map((key) => {
            const fd = getFieldDescription(`safeOutput.${key}`);
            const enabled = safeOutputs[key]?.enabled ?? false;
            return (
              <label key={key} style={checkboxRowStyle}>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={() => toggleSafeOutput(key)}
                  style={{ marginRight: '8px', flexShrink: 0 }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1f2328' }}>
                    {fd.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#656d76', marginTop: '2px', lineHeight: '1.4' }}>
                    {fd.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      ))}
    </PanelContainer>
  );
}

const summaryStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#656d76',
  marginBottom: '16px',
  padding: '8px 12px',
  background: '#f6f8fa',
  borderRadius: '6px',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  padding: '10px 0',
  cursor: 'pointer',
  borderBottom: '1px solid #f0f0f0',
  gap: '4px',
};
