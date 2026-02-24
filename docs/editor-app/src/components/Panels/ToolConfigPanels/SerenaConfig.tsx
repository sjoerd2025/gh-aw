import { useWorkflowStore } from '../../../stores/workflowStore';
import { getFieldDescription } from '../../../utils/fieldDescriptions';

const LANGUAGES = ['go', 'typescript', 'python', 'java', 'rust', 'csharp'] as const;

const EMPTY: Record<string, unknown> = {};

export function SerenaConfig() {
  const config = useWorkflowStore((s) => s.toolConfigs['serena']) ?? EMPTY;
  const setToolConfig = useWorkflowStore((s) => s.setToolConfig);

  const update = (key: string, value: unknown) => {
    const next = { ...config, [key]: value };
    if (value === '' || (Array.isArray(value) && value.length === 0)) delete next[key];
    setToolConfig('serena', next);
  };

  const selectedLangs = (config.languages as string[]) ?? [];

  const toggleLang = (lang: string) => {
    const next = selectedLangs.includes(lang)
      ? selectedLangs.filter((l) => l !== lang)
      : [...selectedLangs, lang];
    update('languages', next);
  };

  return (
    <div style={containerStyle}>
      {/* Version */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.serena.version').label}</label>
        <input
          type="text"
          value={(config.version as string) ?? ''}
          onChange={(e) => update('version', e.target.value)}
          placeholder="Latest"
          style={inputStyle}
        />
        <div style={helpStyle}>{getFieldDescription('toolConfig.serena.version').description}</div>
      </div>

      {/* Mode */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.serena.mode').label}</label>
        <select
          value={(config.mode as string) ?? ''}
          onChange={(e) => update('mode', e.target.value || undefined)}
          style={selectStyle}
        >
          <option value="">Default</option>
          <option value="docker">Docker</option>
          <option value="local">Local</option>
        </select>
        <div style={helpStyle}>{getFieldDescription('toolConfig.serena.mode').description}</div>
      </div>

      {/* Languages */}
      <div>
        <label style={labelStyle}>{getFieldDescription('toolConfig.serena.languages').label}</label>
        <div style={langGridStyle}>
          {LANGUAGES.map((lang) => {
            const active = selectedLangs.includes(lang);
            return (
              <button
                key={lang}
                onClick={() => toggleLang(lang)}
                style={{
                  ...langChipStyle,
                  borderColor: active ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)',
                  backgroundColor: active ? 'color-mix(in srgb, var(--color-accent-fg) 12%, transparent)' : 'var(--color-bg-default, #ffffff)',
                  color: active ? 'var(--color-accent-fg, #0969da)' : 'var(--color-fg-muted, #656d76)',
                }}
              >
                {lang}
              </button>
            );
          })}
        </div>
        <div style={helpStyle}>{getFieldDescription('toolConfig.serena.languages').description}</div>
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

const langGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const langChipStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '11px',
  fontWeight: 500,
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '14px',
  cursor: 'pointer',
  background: 'var(--color-bg-default, #ffffff)',
  transition: 'all 150ms ease',
};
