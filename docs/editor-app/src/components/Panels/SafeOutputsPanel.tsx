import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { AdvancedSection } from '../shared/AdvancedSection';
import { FieldError } from '../shared/FieldError';
import { getErrorsForField } from '../../utils/validation';
import type { SafeOutputKey, SafeOutputConfig } from '../../types/workflow';

interface OutputCategory {
  name: string;
  items: SafeOutputKey[];
}

interface ConfigFieldDef {
  key: string;
  label: string;
  type: 'number' | 'string' | 'boolean' | 'string-array';
  placeholder?: string;
}

const safeOutputConfigFields: Record<string, ConfigFieldDef[]> = {
  'add-comment': [
    { key: 'max', label: 'Max comments', type: 'number', placeholder: 'Unlimited' },
  ],
  'add-labels': [
    { key: 'max', label: 'Max labels', type: 'number', placeholder: 'Unlimited' },
    { key: 'allowed', label: 'Allowed labels', type: 'string-array', placeholder: 'e.g. bug, feature-request' },
  ],
  'create-issue': [
    { key: 'max', label: 'Max issues', type: 'number', placeholder: '1' },
    { key: 'title-prefix', label: 'Title prefix', type: 'string', placeholder: 'e.g. [bot]' },
    { key: 'labels', label: 'Labels', type: 'string-array', placeholder: 'e.g. automation, bot' },
  ],
  'create-pull-request': [
    { key: 'title-prefix', label: 'Title prefix', type: 'string', placeholder: 'e.g. [docs]' },
    { key: 'labels', label: 'Labels', type: 'string-array', placeholder: 'e.g. automation' },
    { key: 'draft', label: 'Create as draft', type: 'boolean' },
    { key: 'expires', label: 'Auto-close after', type: 'string', placeholder: 'e.g. 2d, 7d' },
  ],
  'create-discussion': [
    { key: 'title-prefix', label: 'Title prefix', type: 'string', placeholder: 'e.g. [bot]' },
    { key: 'category', label: 'Category', type: 'string', placeholder: 'e.g. ideas, announcements' },
  ],
};

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

const essentialCategoryNames = ['Comments', 'Issues', 'Pull Requests'];
const advancedCategoryNames = ['Labels', 'Projects', 'Discussions', 'Other'];

const essentialCategories = categories.filter((c) => essentialCategoryNames.includes(c.name));
const advancedCategories = categories.filter((c) => advancedCategoryNames.includes(c.name));

function SafeOutputInlineConfig({ outputKey }: { outputKey: string }) {
  const config = useWorkflowStore((s) => s.safeOutputs[outputKey]?.config) ?? {};
  const setSafeOutputConfig = useWorkflowStore((s) => s.setSafeOutputConfig);

  const fields = safeOutputConfigFields[outputKey];
  if (!fields) return null;

  const update = (fieldKey: string, value: unknown) => {
    const next = { ...config, [fieldKey]: value };
    // Remove empty/default values to keep config clean
    if (value === '' || value === undefined || value === null || value === false) {
      delete next[fieldKey];
    }
    // Remove empty arrays
    if (Array.isArray(value) && value.length === 0) {
      delete next[fieldKey];
    }
    setSafeOutputConfig(outputKey, next);
  };

  return (
    <div style={configContainerStyle}>
      {fields.map((field) => {
        if (field.type === 'boolean') {
          const checked = !!config[field.key];
          return (
            <div key={field.key} style={configToggleFieldStyle}>
              <label style={configToggleLabelStyle}>
                <span>{field.label}</span>
                <div
                  onClick={(e) => { e.preventDefault(); update(field.key, !checked); }}
                  style={{
                    ...miniToggleTrackStyle,
                    backgroundColor: checked
                      ? 'var(--color-accent-fg, #0969da)'
                      : 'var(--color-border-default, #d0d7de)',
                  }}
                >
                  <div style={{
                    ...miniToggleThumbStyle,
                    transform: checked ? 'translateX(14px)' : 'translateX(0)',
                  }} />
                </div>
              </label>
            </div>
          );
        }

        if (field.type === 'number') {
          return (
            <div key={field.key}>
              <label style={configLabelStyle}>{field.label}</label>
              <input
                type="number"
                min={1}
                value={(config[field.key] as number) ?? ''}
                onChange={(e) => {
                  const v = e.target.value;
                  update(field.key, v === '' ? '' : Number(v));
                }}
                placeholder={field.placeholder}
                style={configInputStyle}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          );
        }

        if (field.type === 'string-array') {
          const arr = config[field.key];
          const strVal = Array.isArray(arr) ? (arr as string[]).join(', ') : (arr as string) ?? '';
          return (
            <div key={field.key}>
              <label style={configLabelStyle}>{field.label}</label>
              <input
                type="text"
                value={strVal}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw.trim() === '') {
                    update(field.key, []);
                  } else {
                    update(field.key, raw.split(',').map((s) => s.trim()).filter(Boolean));
                  }
                }}
                placeholder={field.placeholder}
                style={configInputStyle}
                onClick={(e) => e.stopPropagation()}
              />
              <div style={configHelpStyle}>Comma-separated list</div>
            </div>
          );
        }

        // string type
        return (
          <div key={field.key}>
            <label style={configLabelStyle}>{field.label}</label>
            <input
              type="text"
              value={(config[field.key] as string) ?? ''}
              onChange={(e) => update(field.key, e.target.value)}
              placeholder={field.placeholder}
              style={configInputStyle}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      })}
    </div>
  );
}

function renderCategory(
  cat: OutputCategory,
  safeOutputs: Record<string, SafeOutputConfig>,
  toggleSafeOutput: (key: string) => void,
) {
  return (
    <div key={cat.name} className="panel__section">
      <div className="panel__section-title">{cat.name}</div>
      {cat.items.map((key) => {
        const fd = getFieldDescription(`safeOutput.${key}`);
        const enabled = safeOutputs[key]?.enabled ?? false;
        const hasConfigFields = !!safeOutputConfigFields[key];
        return (
          <div key={key}>
            <label style={checkboxRowStyle}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => toggleSafeOutput(key)}
                style={{ marginRight: '8px', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-fg-default, #1f2328)' }}>
                  {fd.label}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-fg-muted, #656d76)', marginTop: '2px', lineHeight: '1.4' }}>
                  {fd.description}
                </div>
              </div>
            </label>
            {enabled && hasConfigFields && <SafeOutputInlineConfig outputKey={key} />}
          </div>
        );
      })}
    </div>
  );
}

function countAdvancedEnabled(safeOutputs: Record<string, SafeOutputConfig>): number {
  let count = 0;
  for (const cat of advancedCategories) {
    for (const key of cat.items) {
      if (safeOutputs[key]?.enabled) count++;
    }
  }
  return count;
}

export function SafeOutputsPanel() {
  const safeOutputs = useWorkflowStore((s) => s.safeOutputs);
  const toggleSafeOutput = useWorkflowStore((s) => s.toggleSafeOutput);
  const validationErrors = useWorkflowStore((s) => s.validationErrors) ?? [];
  const desc = getFieldDescription('safe-outputs');

  const enabledCount = Object.values(safeOutputs).filter((v) => v.enabled).length;
  const safeOutputErrors = getErrorsForField(validationErrors, 'safeOutputs');

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      <div style={summaryStyle} data-field-path="safeOutputs">
        {enabledCount} action{enabledCount !== 1 ? 's' : ''} enabled
      </div>
      <FieldError errors={safeOutputErrors} />

      {essentialCategories.map((cat) => renderCategory(cat, safeOutputs, toggleSafeOutput))}

      <AdvancedSection configuredCount={countAdvancedEnabled(safeOutputs)}>
        {advancedCategories.map((cat) => renderCategory(cat, safeOutputs, toggleSafeOutput))}
      </AdvancedSection>
    </PanelContainer>
  );
}

const summaryStyle: React.CSSProperties = {
  fontSize: '12px',
  color: 'var(--color-fg-muted, #656d76)',
  marginBottom: '16px',
  padding: '8px 12px',
  background: 'var(--color-bg-subtle, #f6f8fa)',
  borderRadius: '6px',
};

const checkboxRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  padding: '10px 0',
  cursor: 'pointer',
  borderBottom: '1px solid var(--color-border-muted, #d8dee4)',
  gap: '4px',
};

const configContainerStyle: React.CSSProperties = {
  padding: '12px',
  borderLeft: '2px solid var(--color-accent-fg, #0969da)',
  marginTop: '4px',
  marginBottom: '8px',
  marginLeft: '24px',
  background: 'color-mix(in srgb, var(--color-accent-fg, #0969da) 3%, transparent)',
  borderRadius: '0 6px 6px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '10px',
};

const configLabelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-fg-default, #1f2328)',
  marginBottom: '4px',
};

const configInputStyle: React.CSSProperties = {
  width: '100%',
  padding: '6px 10px',
  fontSize: '12px',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '6px',
  outline: 'none',
  boxSizing: 'border-box',
  backgroundColor: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)',
};

const configHelpStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-fg-muted, #656d76)',
  marginTop: '3px',
  lineHeight: '1.4',
};

const configToggleFieldStyle: React.CSSProperties = {};

const configToggleLabelStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-fg-default, #1f2328)',
  cursor: 'pointer',
};

const miniToggleTrackStyle: React.CSSProperties = {
  width: '28px',
  height: '16px',
  borderRadius: '8px',
  position: 'relative',
  transition: 'background-color 150ms ease',
  cursor: 'pointer',
  flexShrink: 0,
};

const miniToggleThumbStyle: React.CSSProperties = {
  width: '12px',
  height: '12px',
  borderRadius: '50%',
  backgroundColor: 'var(--color-bg-default, #ffffff)',
  position: 'absolute',
  top: '2px',
  left: '2px',
  transition: 'transform 150ms ease',
  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
};
