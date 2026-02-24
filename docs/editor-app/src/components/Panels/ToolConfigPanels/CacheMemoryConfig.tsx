import { useWorkflowStore } from '../../../stores/workflowStore';
import { getFieldDescription } from '../../../utils/fieldDescriptions';

const EMPTY: Record<string, unknown> = {};

export function CacheMemoryConfig() {
  const config = useWorkflowStore((s) => s.toolConfigs['cache-memory']) ?? EMPTY;
  const setToolConfig = useWorkflowStore((s) => s.setToolConfig);

  const update = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    if (value === '' || value === false) delete next[key];
    setToolConfig('cache-memory', next);
  };

  return (
    <div style={containerStyle}>
      {/* Key */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.cache-memory.key').label}</label>
        <input
          type="text"
          value={(config.key as string) ?? ''}
          onChange={(e) => update('key', e.target.value)}
          placeholder="e.g. my-workflow-cache"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.cache-memory.key').description}</div>
      </div>

      {/* Scope */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.cache-memory.scope').label}</label>
        <select
          value={(config.scope as string) ?? ''}
          onChange={(e) => update('scope', e.target.value || undefined)}
          style={selectStyle}
        >
          <option value="">Default</option>
          <option value="workflow">Workflow</option>
          <option value="repo">Repository</option>
        </select>
        <div style={helpStyle}>{getFieldDescription('toolConfig.cache-memory.scope').description}</div>
      </div>

      {/* Retention Days */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.cache-memory.retention-days').label}</label>
        <input
          type="number"
          min={1}
          max={90}
          value={(config['retention-days'] as number) ?? ''}
          onChange={(e) => update('retention-days', e.target.value ? parseInt(e.target.value, 10) : '')}
          placeholder="7"
          style={{ ...inputStyle, width: '80px' }}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.cache-memory.retention-days').description}</div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.cache-memory.description').label}</label>
        <input
          type="text"
          value={(config.description as string) ?? ''}
          onChange={(e) => update('description', e.target.value)}
          placeholder="What this cache stores"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.cache-memory.description').description}</div>
      </div>

      {/* Restore Only */}
      <div style={toggleFieldStyle}>
        <label style={toggleLabelStyle}>
          <span>{getFieldDescription('toolConfig.cache-memory.restore-only').label}</span>
          <div
            onClick={() => update('restore-only', !config['restore-only'])}
            style={{
              ...miniToggleTrackStyle,
              backgroundColor: config['restore-only'] ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)',
            }}
          >
            <div style={{
              ...miniToggleThumbStyle,
              transform: config['restore-only'] ? 'translateX(14px)' : 'translateX(0)',
            }} />
          </div>
        </label>
        <div style={helpStyle}>{getFieldDescription('toolConfig.cache-memory.restore-only').description}</div>
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

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
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
