import { useState } from 'react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { X } from 'lucide-react';

export function NetworkPanel() {
  const network = useWorkflowStore((s) => s.network);
  const addAllowedDomain = useWorkflowStore((s) => s.addAllowedDomain);
  const removeAllowedDomain = useWorkflowStore((s) => s.removeAllowedDomain);
  const addBlockedDomain = useWorkflowStore((s) => s.addBlockedDomain);
  const removeBlockedDomain = useWorkflowStore((s) => s.removeBlockedDomain);
  const desc = getFieldDescription('network');

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      <DomainList
        label={getFieldDescription('network.allowed').label}
        description={getFieldDescription('network.allowed').description}
        domains={network.allowed}
        onAdd={addAllowedDomain}
        onRemove={removeAllowedDomain}
        placeholder="e.g. api.example.com"
      />
      <DomainList
        label={getFieldDescription('network.blocked').label}
        description={getFieldDescription('network.blocked').description}
        domains={network.blocked}
        onAdd={addBlockedDomain}
        onRemove={removeBlockedDomain}
        placeholder="e.g. evil.example.com"
      />
      <div className="panel__info">
        Essential services (GitHub API, AI providers) are always allowed.
      </div>
    </PanelContainer>
  );
}

function DomainList({
  label,
  description,
  domains,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  description: string;
  domains: string[];
  onAdd: (d: string) => void;
  onRemove: (d: string) => void;
  placeholder: string;
}) {
  const [input, setInput] = useState('');

  const handleAdd = () => {
    const trimmed = input.trim();
    if (trimmed && !domains.includes(trimmed)) {
      onAdd(trimmed);
      setInput('');
    }
  };

  return (
    <div className="panel__section">
      <div className="panel__label">{label}</div>
      <div className="panel__help" style={{ marginBottom: '10px', marginTop: '0' }}>{description}</div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder={placeholder}
          style={inputStyle}
        />
        <button onClick={handleAdd} style={addButtonStyle}>Add</button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {domains.map((d) => (
          <span key={d} style={chipStyle}>
            {d}
            <button
              onClick={() => onRemove(d)}
              style={chipRemoveStyle}
              title={`Remove ${d}`}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        {domains.length === 0 && (
          <span style={{ fontSize: '12px', color: '#656d76', fontStyle: 'italic' }}>
            None added
          </span>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '13px',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  outline: 'none',
};

const addButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '13px',
  border: '1px solid #d0d7de',
  borderRadius: '6px',
  background: '#f6f8fa',
  color: '#1f2328',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const chipStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '5px 10px',
  fontSize: '12px',
  background: '#ddf4ff',
  border: '1px solid #54aeff',
  borderRadius: '16px',
  color: '#0969da',
};

const chipRemoveStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#0969da',
  padding: 0,
};
