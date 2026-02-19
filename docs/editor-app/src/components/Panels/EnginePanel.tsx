import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import type { EngineType } from '../../types/workflow';

interface EngineOption {
  type: EngineType;
  fieldKey: string;
  color: string;
  bgColor: string;
}

const engineOptions: EngineOption[] = [
  { type: 'copilot', fieldKey: 'engine.copilot', color: '#0969da', bgColor: '#ddf4ff' },
  { type: 'claude', fieldKey: 'engine.claude', color: '#8250df', bgColor: '#fbefff' },
  { type: 'codex', fieldKey: 'engine.codex', color: '#1a7f37', bgColor: '#dafbe1' },
  { type: 'custom', fieldKey: 'engine.copilot', color: '#656d76', bgColor: '#f6f8fa' },
];

export function EnginePanel() {
  const engine = useWorkflowStore((s) => s.engine);
  const setEngine = useWorkflowStore((s) => s.setEngine);
  const desc = getFieldDescription('engine');

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      {/* Engine selector */}
      <div className="panel__section">
        <div className="panel__section-title">AI Engine</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {engineOptions.map((opt) => {
            const fd = opt.type === 'custom'
              ? { label: 'Custom Engine', description: 'Use a custom or self-hosted AI engine.' }
              : getFieldDescription(opt.fieldKey);
            const active = engine.type === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => setEngine({ type: opt.type })}
                style={{
                  ...engineCardStyle,
                  borderColor: active ? opt.color : '#d0d7de',
                  backgroundColor: active ? opt.bgColor : '#ffffff',
                }}
              >
                <div style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  backgroundColor: opt.color,
                  flexShrink: 0,
                  marginTop: '3px',
                }} />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2328' }}>
                    {fd.label}
                  </div>
                  <div style={{ fontSize: '12px', color: '#656d76', marginTop: '4px', lineHeight: '1.4' }}>
                    {fd.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model input */}
      {engine.type && (
        <div className="panel__section">
          <div className="panel__label">
            {getFieldDescription('engine.model').label}
          </div>
          <input
            type="text"
            value={engine.model}
            onChange={(e) => setEngine({ model: e.target.value })}
            placeholder={getModelPlaceholder(engine.type)}
            style={inputStyle}
          />
          <div className="panel__help">
            {getFieldDescription('engine.model').description} Leave blank for the default.
          </div>
        </div>
      )}

      {/* Max turns */}
      {engine.type && (
        <div className="panel__section">
          <div className="panel__label">
            {getFieldDescription('engine.maxTurns').label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <input
              type="range"
              min={1}
              max={100}
              value={engine.maxTurns || 10}
              onChange={(e) => setEngine({ maxTurns: parseInt(e.target.value, 10) })}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min={1}
              max={200}
              value={engine.maxTurns || ''}
              onChange={(e) => {
                const v = e.target.value;
                setEngine({ maxTurns: v ? parseInt(v, 10) : '' });
              }}
              placeholder="10"
              style={{ ...inputStyle, width: '60px', textAlign: 'center' }}
            />
          </div>
          <div className="panel__help">
            {getFieldDescription('engine.maxTurns').description}
          </div>
        </div>
      )}
    </PanelContainer>
  );
}

function getModelPlaceholder(type: EngineType): string {
  switch (type) {
    case 'claude': return 'e.g. claude-sonnet-4-20250514';
    case 'copilot': return 'e.g. gpt-4o';
    case 'codex': return 'e.g. codex-mini';
    case 'custom': return 'Enter model identifier';
  }
}

const engineCardStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '12px',
  padding: '14px',
  border: '1px solid #d0d7de',
  borderRadius: '8px',
  cursor: 'pointer',
  textAlign: 'left',
  background: '#ffffff',
  transition: 'border-color 150ms ease, background 150ms ease',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  fontSize: '13px',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  outline: 'none',
};
