import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

const isMac =
  typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
const MOD = isMac ? '\u2318' : 'Ctrl';

interface Shortcut {
  keys: string;
  description: string;
}

const shortcuts: Shortcut[] = [
  { keys: `${MOD}+S`, description: 'Download .md file' },
  { keys: `${MOD}+E`, description: 'Toggle visual / editor mode' },
  { keys: `${MOD}+Shift+E`, description: 'Toggle YAML preview panel' },
  { keys: `${MOD}+Z`, description: 'Undo' },
  { keys: `${MOD}+Shift+Z`, description: 'Redo' },
  { keys: 'Delete / Backspace', description: 'Delete selected node (visual mode)' },
  { keys: 'Escape', description: 'Deselect node / close panel' },
  { keys: '?', description: 'Show this help' },
];

export function ShortcutsHelp() {
  const show = useUIStore((s) => s.showShortcutsHelp);
  const setShow = useUIStore((s) => s.setShowShortcutsHelp);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Close on click-outside
  useEffect(() => {
    if (!show) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && e.target === overlayRef.current) {
        setShow(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show, setShow]);

  if (!show) return null;

  return (
    <div ref={overlayRef} style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>Keyboard Shortcuts</span>
          <button onClick={() => setShow(false)} style={closeButtonStyle} title="Close">
            <X size={16} />
          </button>
        </div>

        <div style={bodyStyle}>
          {shortcuts.map((s) => (
            <div key={s.keys} style={rowStyle}>
              <kbd style={kbdStyle}>{s.keys}</kbd>
              <span style={{ color: 'var(--color-fg-default, #1f2328)' }}>{s.description}</span>
            </div>
          ))}
        </div>

        <div style={footerStyle}>
          Press <kbd style={{ ...kbdStyle, padding: '1px 5px', fontSize: 11 }}>Esc</kbd> or click outside to close
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────── */

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(0,0,0,0.4)',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--color-bg-default, #ffffff)',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.16)',
  width: 420,
  maxWidth: '90vw',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: '1px solid var(--color-border-default, #d0d7de)',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  display: 'flex',
  alignItems: 'center',
  color: 'var(--color-fg-muted, #656d76)',
  borderRadius: 6,
};

const bodyStyle: React.CSSProperties = {
  padding: '8px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
};

const rowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 0',
  fontSize: 13,
};

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 7px',
  fontSize: 12,
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
  lineHeight: '18px',
  color: 'var(--color-fg-default, #1f2328)',
  background: 'var(--color-bg-subtle, #f6f8fa)',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: 6,
  boxShadow: 'inset 0 -1px 0 var(--color-border-default, #d0d7de)',
};

const footerStyle: React.CSSProperties = {
  padding: '8px 16px',
  fontSize: 12,
  color: 'var(--color-fg-muted, #656d76)',
  borderTop: '1px solid var(--color-border-default, #d0d7de)',
  textAlign: 'center',
};
