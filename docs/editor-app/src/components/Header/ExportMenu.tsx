import { useState, useRef, useEffect } from 'react';
import { Download, Copy, ChevronDown, Link, FileText, AlertTriangle } from 'lucide-react';
import { toast } from '../../utils/lazyToast';
import { useWorkflowStore } from '../../stores/workflowStore';
import { encodeState } from '../../utils/deepLink';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export function ExportMenu() {
  const name = useWorkflowStore((s) => s.name);
  const compiledYaml = useWorkflowStore((s) => s.compiledYaml);
  const compiledMarkdown = useWorkflowStore((s) => s.compiledMarkdown);
  const error = useWorkflowStore((s) => s.error);
  const isCompiling = useWorkflowStore((s) => s.isCompiling);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const keyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', keyHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', keyHandler);
    };
  }, [open]);

  const hasMarkdown = !!compiledMarkdown;
  const hasYaml = !!compiledYaml && !error;
  const hasContent = hasMarkdown || hasYaml;
  const canExport = hasContent && !isCompiling;

  const handleDownload = (type: 'md' | 'yml') => {
    setOpen(false);
    const content = type === 'md' ? compiledMarkdown : compiledYaml;
    const filename = `${name || 'workflow'}.${type === 'md' ? 'md' : 'lock.yml'}`;
    const blob = new Blob([content || ''], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  };

  const handleCopyYaml = () => {
    setOpen(false);
    navigator.clipboard.writeText(compiledYaml || '').then(() => toast.success('YAML copied to clipboard'));
  };

  const handleCopyMarkdown = () => {
    setOpen(false);
    navigator.clipboard.writeText(compiledMarkdown || '').then(() => toast.success('Markdown copied to clipboard'));
  };

  const handleCopyShareLink = () => {
    setOpen(false);
    const state = useWorkflowStore.getState();
    const encoded = encodeState(state);
    const url = `${window.location.origin}${window.location.pathname}#b64=${encoded}`;
    if (url.length > 2000) {
      toast.error('Workflow too large to share via URL');
      return;
    }
    navigator.clipboard.writeText(url).then(() => toast.success('Share link copied to clipboard'));
  };

  const disabledStyle: React.CSSProperties = {
    opacity: 0.4,
    cursor: 'not-allowed',
  };

  const exportButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    ...(error ? {
      borderColor: 'var(--color-danger-emphasis, #cf222e)',
      color: 'var(--color-danger-fg, #cf222e)',
    } : {}),
  };

  return (
    <div style={{ position: 'relative' }} ref={ref} data-tour-target="export">
      <button
        onClick={() => setOpen(!open)}
        style={exportButtonStyle}
        title={error ? 'YAML export unavailable — fix errors first' : 'Export workflow'}
        aria-label="Export workflow"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Download size={14} aria-hidden="true" /> Export <ChevronDown size={12} aria-hidden="true" />
      </button>
      {open && (
        <div style={dropdownStyle} role="menu" aria-label="Export options">
          {/* Error banner */}
          {error && (
            <>
              <div style={errorBannerStyle}>
                <AlertTriangle size={12} />
                <span>YAML unavailable — fix errors first</span>
              </div>
              <div style={dividerStyle} />
            </>
          )}

          {/* Download section */}
          <div style={sectionLabelStyle} role="presentation">Download</div>
          <button
            role="menuitem"
            onClick={() => hasMarkdown && handleDownload('md')}
            style={{ ...menuItemStyle, ...(hasMarkdown ? {} : disabledStyle) }}
            disabled={!hasMarkdown}
          >
            <Download size={14} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              {name || 'workflow'}.md
            </span>
            {hasMarkdown && <span style={sizeStyle}>{formatSize(compiledMarkdown.length)}</span>}
          </button>
          <button
            role="menuitem"
            onClick={() => hasYaml && handleDownload('yml')}
            style={{ ...menuItemStyle, ...(hasYaml ? {} : disabledStyle) }}
            disabled={!hasYaml}
          >
            <Download size={14} aria-hidden="true" />
            <span style={{ flex: 1 }}>
              {name || 'workflow'}.lock.yml
            </span>
            {hasYaml && <span style={sizeStyle}>{formatSize(compiledYaml.length)}</span>}
          </button>

          {/* Divider */}
          <div style={dividerStyle} role="separator" />

          {/* Copy section */}
          <div style={sectionLabelStyle} role="presentation">Copy</div>
          <button
            role="menuitem"
            onClick={() => hasMarkdown && handleCopyMarkdown()}
            style={{ ...menuItemStyle, ...(hasMarkdown ? {} : disabledStyle) }}
            disabled={!hasMarkdown}
          >
            <FileText size={14} aria-hidden="true" /> Copy Markdown
          </button>
          <button
            role="menuitem"
            onClick={() => hasYaml && handleCopyYaml()}
            style={{ ...menuItemStyle, ...(hasYaml ? {} : disabledStyle) }}
            disabled={!hasYaml}
          >
            <Copy size={14} aria-hidden="true" /> Copy YAML
          </button>

          {/* Divider */}
          <div style={dividerStyle} role="separator" />

          {/* Share link */}
          <button
            role="menuitem"
            onClick={() => canExport && handleCopyShareLink()}
            style={{ ...menuItemStyle, ...(canExport ? {} : disabledStyle) }}
            disabled={!canExport}
          >
            <Link size={14} aria-hidden="true" /> Copy Share Link
          </button>
        </div>
      )}
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
  fontSize: 13, fontWeight: 500,
  border: '1px solid var(--color-border-default, #d0d7de)', borderRadius: 6,
  background: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)', cursor: 'pointer',
  transition: 'background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
};

const dropdownStyle: React.CSSProperties = {
  position: 'absolute', top: '100%', right: 0, marginTop: 4,
  background: 'var(--color-bg-default, #ffffff)',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
  overflow: 'hidden', zIndex: 100, minWidth: 240,
  padding: '4px 0',
};

const menuItemStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
  padding: '8px 12px', fontSize: 13, border: 'none', background: 'none',
  color: 'var(--color-fg-default, #1f2328)', cursor: 'pointer',
  textAlign: 'left' as const, transition: 'background 0.15s ease',
};

const sizeStyle: React.CSSProperties = {
  fontSize: 11, color: 'var(--color-fg-muted, #656d76)', fontWeight: 400,
};

const sectionLabelStyle: React.CSSProperties = {
  padding: '4px 12px 2px', fontSize: 11, fontWeight: 600,
  color: 'var(--color-fg-muted, #656d76)', textTransform: 'uppercase',
  letterSpacing: '0.5px',
};

const errorBannerStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '6px 12px', fontSize: 12,
  color: 'var(--color-danger-fg, #cf222e)',
  background: 'color-mix(in srgb, var(--color-danger-fg, #cf222e) 8%, transparent)',
};

const dividerStyle: React.CSSProperties = {
  height: 1, background: 'var(--color-border-default, #d0d7de)',
  margin: '4px 0',
};
