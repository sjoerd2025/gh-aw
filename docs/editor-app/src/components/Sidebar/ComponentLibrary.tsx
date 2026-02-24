import { useState } from 'react';
import { Package, Plus, X, Check, Globe, Loader2 } from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import {
  sharedComponents,
  type SharedComponent,
  isRemoteImport,
  remoteImportLabel,
  fetchRemoteComponent,
  clearRemoteCache,
} from '../../utils/sharedComponents';
import { toast } from '../../utils/lazyToast';

export function ComponentLibrary() {
  const imports = useWorkflowStore((s) => s.imports);
  const addImport = useWorkflowStore((s) => s.addImport);
  const removeImport = useWorkflowStore((s) => s.removeImport);

  const [urlInput, setUrlInput] = useState('');
  const [fetching, setFetching] = useState(false);

  const handleImportUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      toast.error('URL must start with http:// or https://');
      return;
    }
    if (imports.includes(url)) {
      toast.info('Already imported');
      return;
    }
    setFetching(true);
    try {
      await fetchRemoteComponent(url);
      addImport(url);
      setUrlInput('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(msg);
    } finally {
      setFetching(false);
    }
  };

  const handleRemoveRemote = (url: string) => {
    removeImport(url);
    clearRemoteCache(url);
  };

  return (
    <div style={{ padding: 12 }}>
      {/* URL import input */}
      <div style={{ marginBottom: 16 }}>
        <div style={{
          padding: '4px 4px 6px',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
          color: 'var(--color-fg-muted, #656d76)',
        }}>
          Import from URL
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleImportUrl(); }}
            placeholder="https://raw.githubusercontent.com/..."
            disabled={fetching}
            style={{
              flex: 1,
              padding: '6px 8px',
              fontSize: 12,
              border: '1px solid var(--color-border-default, #d0d7de)',
              borderRadius: 6,
              background: 'var(--color-bg-default, #ffffff)',
              color: 'var(--color-fg-default, #1f2328)',
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            onClick={handleImportUrl}
            disabled={fetching || !urlInput.trim()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 500,
              border: '1px solid var(--color-accent-fg, #0969da)',
              borderRadius: 6,
              background: 'var(--color-accent-fg, #0969da)',
              color: '#fff',
              cursor: fetching || !urlInput.trim() ? 'not-allowed' : 'pointer',
              opacity: fetching || !urlInput.trim() ? 0.5 : 1,
              whiteSpace: 'nowrap',
            }}
          >
            {fetching ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Globe size={12} />}
            Import
          </button>
        </div>
      </div>

      {/* Active imports */}
      {imports.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{
            padding: '4px 4px 6px',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
            color: 'var(--color-fg-muted, #656d76)',
          }}>
            Imported
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 4px' }}>
            {imports.map((imp) => {
              if (isRemoteImport(imp)) {
                return (
                  <ImportChip
                    key={imp}
                    label={remoteImportLabel(imp)}
                    icon={<Globe size={10} />}
                    title={imp}
                    onRemove={() => handleRemoveRemote(imp)}
                  />
                );
              }
              const component = sharedComponents.find((c) => c.path === imp);
              return (
                <ImportChip
                  key={imp}
                  label={component?.name ?? imp}
                  onRemove={() => removeImport(imp)}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Available components */}
      <div>
        <div style={{
          padding: '4px 4px 6px',
          fontSize: 11,
          fontWeight: 600,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
          color: 'var(--color-fg-muted, #656d76)',
        }}>
          Shared Components
        </div>
        {sharedComponents.map((component) => (
          <ComponentCard
            key={component.path}
            component={component}
            isImported={imports.includes(component.path)}
            onAdd={() => addImport(component.path)}
            onRemove={() => removeImport(component.path)}
          />
        ))}
      </div>
    </div>
  );
}

function ImportChip({ label, icon, title, onRemove }: {
  label: string;
  icon?: React.ReactNode;
  title?: string;
  onRemove: () => void;
}) {
  return (
    <span
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px',
        fontSize: 11,
        fontWeight: 500,
        borderRadius: 12,
        background: 'color-mix(in srgb, var(--color-accent-fg, #0969da) 10%, transparent)',
        color: 'var(--color-accent-fg, #0969da)',
        border: '1px solid color-mix(in srgb, var(--color-accent-fg, #0969da) 25%, transparent)',
      }}
    >
      {icon ?? <Package size={10} />}
      {label}
      <button
        onClick={onRemove}
        style={{
          display: 'flex',
          alignItems: 'center',
          border: 'none',
          background: 'none',
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
          marginLeft: 2,
        }}
        title="Remove import"
      >
        <X size={10} />
      </button>
    </span>
  );
}

function ComponentCard({
  component,
  isImported,
  onAdd,
  onRemove,
}: {
  component: SharedComponent;
  isImported: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={isImported ? onRemove : onAdd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 10,
        width: '100%',
        padding: 10,
        marginBottom: 4,
        border: `1px solid ${
          isImported
            ? 'var(--color-accent-fg, #0969da)'
            : hovered
              ? 'var(--color-fg-subtle, #6e7781)'
              : 'var(--color-border-default, #d0d7de)'
        }`,
        borderRadius: 8,
        background: isImported
          ? 'color-mix(in srgb, var(--color-accent-fg, #0969da) 6%, transparent)'
          : hovered
            ? 'var(--color-bg-subtle, #f6f8fa)'
            : 'var(--color-bg-default, #ffffff)',
        cursor: 'pointer',
        textAlign: 'left' as const,
        transition: 'box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 32,
        height: 32,
        borderRadius: 8,
        background: isImported
          ? 'color-mix(in srgb, var(--color-accent-fg, #0969da) 15%, transparent)'
          : 'var(--color-bg-muted, #eaeef2)',
        color: isImported
          ? 'var(--color-accent-fg, #0969da)'
          : 'var(--color-fg-muted, #656d76)',
        flexShrink: 0,
        transition: 'transform 0.15s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}>
        {isImported ? <Check size={16} /> : <Package size={16} />}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-fg-default, #1f2328)',
          marginBottom: 2,
        }}>
          {component.name}
          {!isImported && hovered && (
            <Plus size={12} style={{ color: 'var(--color-accent-fg, #0969da)' }} />
          )}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--color-fg-muted, #656d76)',
          lineHeight: 1.3,
          marginBottom: 4,
        }}>
          {component.description}
        </div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {component.provides.map((tag) => (
            <span key={tag} style={{
              fontSize: 10,
              padding: '1px 6px',
              borderRadius: 8,
              background: 'var(--color-bg-muted, #eaeef2)',
              color: 'var(--color-fg-muted, #656d76)',
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
