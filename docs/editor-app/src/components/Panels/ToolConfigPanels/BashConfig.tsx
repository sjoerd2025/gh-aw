import { useWorkflowStore } from '../../../stores/workflowStore';
import { getFieldDescription } from '../../../utils/fieldDescriptions';

const EMPTY: Record<string, unknown> = {};

export function BashConfig() {
  const config = useWorkflowStore((s) => s.toolConfigs['bash']) ?? EMPTY;
  const setToolConfig = useWorkflowStore((s) => s.setToolConfig);

  const allowAll = !config['allowed-commands'];

  const update = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    if (value === '') delete next[key];
    setToolConfig('bash', next);
  };

  const toggleAllowAll = () => {
    if (!allowAll) {
      update('allowed-commands', '');
    }
  };

  return (
    <div style={containerStyle}>
      <div style={infoBoxStyle}>
        Leave empty to allow all commands. Enter specific commands to restrict access.
      </div>

      {/* Allow all toggle */}
      <div style={toggleFieldStyle}>
        <label style={toggleLabelStyle}>
          <span>Allow all commands</span>
          <div
            onClick={toggleAllowAll}
            style={{
              ...miniToggleTrackStyle,
              backgroundColor: allowAll ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)',
            }}
          >
            <div style={{
              ...miniToggleThumbStyle,
              transform: allowAll ? 'translateX(14px)' : 'translateX(0)',
            }} />
          </div>
        </label>
        <div style={helpStyle}>The agent can run any shell command. Disable to restrict to specific commands.</div>
      </div>

      {/* Allowed commands input — only shown when not "allow all" */}
      {!allowAll && (
        <div>
          <label style={labelStyle}>{getFieldDescription('toolConfig.bash.allowed-commands').label}</label>
          <input
            type="text"
            value={(config['allowed-commands'] as string) ?? ''}
            onChange={(e) => update('allowed-commands', e.target.value)}
            placeholder="e.g. npm test, make build, gh issue comment"
            style={inputStyle}
          />
          <div style={helpStyle}>{getFieldDescription('toolConfig.bash.allowed-commands').description}</div>
        </div>
      )}
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

const infoBoxStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-fg-muted, #656d76)',
  lineHeight: '1.4',
  padding: '8px 10px',
  background: 'color-mix(in srgb, var(--color-accent-fg, #0969da) 6%, transparent)',
  borderRadius: '6px',
  border: '1px solid color-mix(in srgb, var(--color-accent-fg, #0969da) 15%, transparent)',
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
