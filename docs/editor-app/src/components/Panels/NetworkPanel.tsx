import { useState } from 'react';
import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { AdvancedSection } from '../shared/AdvancedSection';
import { FieldError } from '../shared/FieldError';
import { getErrorsForField } from '../../utils/validation';
import { X } from 'lucide-react';

interface EcosystemPreset {
  name: string;
  domains: string[];
  description: string;
}

const ecosystemPresets: EcosystemPreset[] = [
  { name: 'Defaults', domains: ['defaults'], description: 'Essential services (GitHub, AI providers)' },
  { name: 'Python', domains: ['python'], description: 'PyPI, pip, and Python ecosystem' },
  { name: 'Node.js', domains: ['node'], description: 'npm, yarn, and Node ecosystem' },
  { name: 'Go', domains: ['go'], description: 'Go modules and proxy' },
  { name: 'Rust', domains: ['rust'], description: 'Cargo crates and Rust ecosystem' },
  { name: 'Ruby', domains: ['ruby'], description: 'RubyGems and Bundler' },
  { name: 'Java', domains: ['java'], description: 'Maven Central and Gradle' },
  { name: 'Docker', domains: ['docker'], description: 'Docker Hub and registries' },
];

export function NetworkPanel() {
  const network = useWorkflowStore((s) => s.network);
  const addAllowedDomain = useWorkflowStore((s) => s.addAllowedDomain);
  const removeAllowedDomain = useWorkflowStore((s) => s.removeAllowedDomain);
  const addBlockedDomain = useWorkflowStore((s) => s.addBlockedDomain);
  const removeBlockedDomain = useWorkflowStore((s) => s.removeBlockedDomain);
  const setNetwork = useWorkflowStore((s) => s.setNetwork);
  const validationErrors = useWorkflowStore((s) => s.validationErrors) ?? [];
  const desc = getFieldDescription('network');

  const allowedErrors = getErrorsForField(validationErrors, 'network.allowed');
  const blockedErrors = getErrorsForField(validationErrors, 'network.blocked');

  const addPresetDomains = (preset: EcosystemPreset) => {
    for (const domain of preset.domains) {
      if (!network.allowed.includes(domain)) {
        addAllowedDomain(domain);
      }
    }
  };

  const isPresetFullyAdded = (preset: EcosystemPreset) =>
    preset.domains.every((d) => network.allowed.includes(d));

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      <DomainList
        label={getFieldDescription('network.allowed').label}
        description={getFieldDescription('network.allowed').description}
        domains={network.allowed}
        onAdd={addAllowedDomain}
        onRemove={removeAllowedDomain}
        onClearAll={() => setNetwork({ allowed: [] })}
        placeholder="e.g. api.example.com"
        errors={allowedErrors}
        fieldPath="network.allowed"
        presets={
          <div style={presetsContainerStyle}>
            <div style={presetsLabelStyle}>Quick add ecosystems</div>
            <div style={presetsGridStyle}>
              {ecosystemPresets.map((preset) => {
                const added = isPresetFullyAdded(preset);
                return (
                  <button
                    key={preset.name}
                    onClick={() => addPresetDomains(preset)}
                    disabled={added}
                    style={added ? { ...presetButtonStyle, ...presetButtonAddedStyle } : presetButtonStyle}
                    title={`${preset.description}: ${preset.domains.join(', ')}`}
                  >
                    {preset.name}
                    {added && ' ✓'}
                  </button>
                );
              })}
            </div>
          </div>
        }
      />
      <div className="panel__info">
        Essential services (GitHub API, AI providers) are always allowed.
      </div>
      <AdvancedSection configuredCount={network.blocked.length}>
        <DomainList
          label={getFieldDescription('network.blocked').label}
          description={getFieldDescription('network.blocked').description}
          domains={network.blocked}
          onAdd={addBlockedDomain}
          onRemove={removeBlockedDomain}
          placeholder="e.g. evil.example.com"
          errors={blockedErrors}
          fieldPath="network.blocked"
        />
      </AdvancedSection>
    </PanelContainer>
  );
}

function DomainList({
  label,
  description,
  domains,
  onAdd,
  onRemove,
  onClearAll,
  placeholder,
  errors,
  fieldPath,
  presets,
}: {
  label: string;
  description: string;
  domains: string[];
  onAdd: (d: string) => void;
  onRemove: (d: string) => void;
  onClearAll?: () => void;
  placeholder: string;
  errors: import('../../utils/validation').ValidationError[];
  fieldPath?: string;
  presets?: React.ReactNode;
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
    <div className="panel__section" {...(fieldPath ? { 'data-field-path': fieldPath } : {})}>
      <div className="panel__label">{label}</div>
      <div className="panel__help" style={{ marginBottom: '10px', marginTop: '0' }}>{description}</div>
      {presets}
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
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
          <span style={{ fontSize: '12px', color: 'var(--color-fg-muted, #656d76)', fontStyle: 'italic' }}>
            None added
          </span>
        )}
        {onClearAll && domains.length > 0 && (
          <button onClick={onClearAll} style={clearAllButtonStyle}>
            Clear all
          </button>
        )}
      </div>
      <FieldError errors={errors} />
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '8px 12px',
  fontSize: '13px',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '6px',
  outline: 'none',
  backgroundColor: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)',
};

const addButtonStyle: React.CSSProperties = {
  padding: '8px 14px',
  fontSize: '13px',
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
  gap: '6px',
  padding: '5px 10px',
  fontSize: '12px',
  background: 'color-mix(in srgb, var(--color-accent-fg) 12%, transparent)',
  border: '1px solid var(--color-accent-fg, #0969da)',
  borderRadius: '16px',
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

const clearAllButtonStyle: React.CSSProperties = {
  fontSize: '11px',
  color: 'var(--color-danger-fg, #d1242f)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '2px 6px',
  borderRadius: '4px',
};

const presetsContainerStyle: React.CSSProperties = {
  marginBottom: '12px',
  padding: '10px',
  borderRadius: '8px',
  background: 'var(--color-bg-subtle, #f6f8fa)',
  border: '1px solid var(--color-border-default, #d0d7de)',
};

const presetsLabelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-fg-muted, #656d76)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '8px',
};

const presetsGridStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '6px',
};

const presetButtonStyle: React.CSSProperties = {
  padding: '4px 10px',
  fontSize: '12px',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: '16px',
  background: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const presetButtonAddedStyle: React.CSSProperties = {
  opacity: 0.5,
  cursor: 'default',
  background: 'var(--color-bg-subtle, #f6f8fa)',
};
