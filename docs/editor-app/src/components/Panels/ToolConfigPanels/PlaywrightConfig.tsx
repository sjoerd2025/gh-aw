import { useState } from 'react';
import { useWorkflowStore } from '../../../stores/workflowStore';
import { getFieldDescription } from '../../../utils/fieldDescriptions';
import { X } from 'lucide-react';

const EMPTY: Record<string, unknown> = {};

export function PlaywrightConfig() {
  const config = useWorkflowStore((s) => s.toolConfigs['playwright']) ?? EMPTY;
  const setToolConfig = useWorkflowStore((s) => s.setToolConfig);
  const [domainInput, setDomainInput] = useState('');

  const update = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    if (value === '' || (Array.isArray(value) && value.length === 0)) delete next[key];
    setToolConfig('playwright', next);
  };

  const domains = (config.allowed_domains as string[]) ?? [];

  const addDomain = () => {
    const trimmed = domainInput.trim();
    if (trimmed && !domains.includes(trimmed)) {
      update('allowed_domains', [...domains, trimmed]);
      setDomainInput('');
    }
  };

  const removeDomain = (d: string) => {
    update('allowed_domains', domains.filter((x) => x !== d));
  };

  return (
    <div style={containerStyle}>
      {/* Version */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.playwright.version').label}</label>
        <input
          type="text"
          value={(config.version as string) ?? ''}
          onChange={(e) => update('version', e.target.value)}
          placeholder="e.g. v1.41.0"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.playwright.version').description}</div>
      </div>

      {/* Allowed Domains */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.playwright.allowed_domains').label}</label>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          <input
            type="text"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addDomain(); }}
            placeholder="e.g. example.com"
            style={{ ...inputStyle, flex: 1 }}
          />
          <button onClick={addDomain} style={addBtnStyle}>Add</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {domains.map((d) => (
            <span key={d} style={chipStyle}>
              {d}
              <button onClick={() => removeDomain(d)} style={chipRemoveStyle} title={`Remove ${d}`}>
                <X size={10} />
              </button>
            </span>
          ))}
          {domains.length === 0 && (
            <span style={{ fontSize: '11px', color: 'var(--color-fg-muted, #656d76)', fontStyle: 'italic' }}>All domains allowed</span>
          )}
        </div>
        <div style={helpStyle}>{getFieldDescription('toolConfig.playwright.allowed_domains').description}</div>
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

const addBtnStyle: React.CSSProperties = {
  padding: '6px 10px',
  fontSize: '12px',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '6px',
  background: 'var(--color-bg-subtle, #f6f8fa)',
  color: 'var(--color-fg-default, #1f2328)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  padding: '3px 8px',
  fontSize: '11px',
  background: 'color-mix(in srgb, var(--color-accent-fg) 12%, transparent)',
  border: '1px solid var(--color-accent-fg, #0969da)',
  borderRadius: '12px',
  color: 'var(--color-accent-fg, #0969da)',
};

const chipRemoveStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: 'var(--color-accent-fg, #0969da)',
  padding: 0,
};
