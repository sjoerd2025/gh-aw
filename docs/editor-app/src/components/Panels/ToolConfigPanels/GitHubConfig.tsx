import { useWorkflowStore } from '../../../stores/workflowStore';
import { getFieldDescription } from '../../../utils/fieldDescriptions';

const EMPTY: Record<string, unknown> = {};

export function GitHubConfig() {
  const config = useWorkflowStore((s) => s.toolConfigs['github']) ?? EMPTY;
  const setToolConfig = useWorkflowStore((s) => s.setToolConfig);

  const update = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    // Remove empty/false values to keep config clean
    if (value === '' || value === false) delete next[key];
    setToolConfig('github', next);
  };

  return (
    <div style={containerStyle}>
      {/* Read-only */}
      <div style={toggleFieldStyle}>
        <label style={toggleLabelStyle}>
          <span>{getFieldDescription('toolConfig.github.read-only').label}</span>
          <div
            onClick={() => update('read-only', !config['read-only'])}
            style={{
              ...miniToggleTrackStyle,
              backgroundColor: config['read-only'] ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)',
            }}
          >
            <div style={{
              ...miniToggleThumbStyle,
              transform: config['read-only'] ? 'translateX(14px)' : 'translateX(0)',
            }} />
          </div>
        </label>
        <div style={helpStyle}>{getFieldDescription('toolConfig.github.read-only').description}</div>
      </div>

      {/* Lockdown */}
      <div style={toggleFieldStyle}>
        <label style={toggleLabelStyle}>
          <span>{getFieldDescription('toolConfig.github.lockdown').label}</span>
          <div
            onClick={() => update('lockdown', !config['lockdown'])}
            style={{
              ...miniToggleTrackStyle,
              backgroundColor: config['lockdown'] ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)',
            }}
          >
            <div style={{
              ...miniToggleThumbStyle,
              transform: config['lockdown'] ? 'translateX(14px)' : 'translateX(0)',
            }} />
          </div>
        </label>
        <div style={helpStyle}>{getFieldDescription('toolConfig.github.lockdown').description}</div>
      </div>

      {/* Toolsets */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{getFieldDescription('toolConfig.github.toolsets').label}</label>
        <input
          type="text"
          value={(config.toolsets as string) ?? ''}
          onChange={(e) => update('toolsets', e.target.value)}
          placeholder="e.g. code-review, issue-triage"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.github.toolsets').description}</div>
      </div>

      {/* Allowed functions */}
      <div style={fieldStyle}>
        <label style={labelStyle}>{getFieldDescription('toolConfig.github.allowed').label}</label>
        <input
          type="text"
          value={(config.allowed as string) ?? ''}
          onChange={(e) => update('allowed', e.target.value)}
          placeholder="e.g. get_file_contents, create_issue"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.github.allowed').description}</div>
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  padding: '12px',
  borderLeft: '2px solid var(--color-accent-fg, #0969da)',
  marginTop: '8px',
  marginBottom: '4px',
  background: 'color-mix(in srgb, var(--color-accent-fg, #0969da) 3%, transparent)',
  borderRadius: '0 6px 6px 0',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
};

const fieldStyle: React.CSSProperties = {};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 500,
  color: 'var(--color-fg-default, #1f2328)',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
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

const helpStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-fg-muted, #656d76)',
  marginTop: '3px',
  lineHeight: '1.4',
};

const toggleFieldStyle: React.CSSProperties = {};

const toggleLabelStyle: React.CSSProperties = {
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
