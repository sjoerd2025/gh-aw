import { useWorkflowStore } from '../../../stores/workflowStore';
import { getFieldDescription } from '../../../utils/fieldDescriptions';

const EMPTY: Record<string, unknown> = {};

export function RepoMemoryConfig() {
  const config = useWorkflowStore((s) => s.toolConfigs['repo-memory']) ?? EMPTY;
  const setToolConfig = useWorkflowStore((s) => s.setToolConfig);

  const update = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    if (value === '') delete next[key];
    setToolConfig('repo-memory', next);
  };

  return (
    <div style={containerStyle}>
      {/* Branch Prefix */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.repo-memory.branch-prefix').label}</label>
        <input
          type="text"
          value={(config['branch-prefix'] as string) ?? ''}
          onChange={(e) => update('branch-prefix', e.target.value)}
          placeholder="memory"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.repo-memory.branch-prefix').description}</div>
      </div>

      {/* Target Repo */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.repo-memory.target-repo').label}</label>
        <input
          type="text"
          value={(config['target-repo'] as string) ?? ''}
          onChange={(e) => update('target-repo', e.target.value)}
          placeholder="e.g. owner/repo"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.repo-memory.target-repo').description}</div>
      </div>

      {/* Branch Name */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.repo-memory.branch-name').label}</label>
        <input
          type="text"
          value={(config['branch-name'] as string) ?? ''}
          onChange={(e) => update('branch-name', e.target.value)}
          placeholder="Auto-generated if blank"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.repo-memory.branch-name').description}</div>
      </div>

      {/* Description */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.repo-memory.description').label}</label>
        <input
          type="text"
          value={(config.description as string) ?? ''}
          onChange={(e) => update('description', e.target.value)}
          placeholder="What this memory branch stores"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.repo-memory.description').description}</div>
      </div>

      {/* File Glob */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.repo-memory.file-glob').label}</label>
        <input
          type="text"
          value={(config['file-glob'] as string) ?? ''}
          onChange={(e) => update('file-glob', e.target.value)}
          placeholder="e.g. **/*.md, docs/**"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.repo-memory.file-glob').description}</div>
      </div>

      {/* Max File Size */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.repo-memory.max-file-size').label}</label>
        <input
          type="number"
          min={1}
          value={(config['max-file-size'] as number) ?? ''}
          onChange={(e) => update('max-file-size', e.target.value ? parseInt(e.target.value, 10) : '')}
          placeholder="Default"
          style={{ ...inputStyle, width: '100px' }}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.repo-memory.max-file-size').description}</div>
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

const helpStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-fg-muted, #656d76)',
  marginTop: '3px',
  lineHeight: '1.4',
};
