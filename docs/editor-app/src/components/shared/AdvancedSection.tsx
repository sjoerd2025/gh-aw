import { useState, useId } from 'react';
import { ChevronRight } from 'lucide-react';

interface AdvancedSectionProps {
  children: React.ReactNode;
  configuredCount?: number;
  defaultOpen?: boolean;
}

export function AdvancedSection({ children, configuredCount = 0, defaultOpen = false }: AdvancedSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div style={sectionStyle}>
      <button
        onClick={() => setOpen(!open)}
        style={toggleStyle}
        aria-expanded={open}
        aria-controls={contentId}
      >
        <ChevronRight
          size={14}
          aria-hidden="true"
          style={{
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 150ms ease',
            color: 'var(--color-fg-muted, #656d76)',
          }}
        />
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-fg-muted, #656d76)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Advanced
        </span>
        {configuredCount > 0 && (
          <span style={badgeStyle}>{configuredCount}</span>
        )}
      </button>
      {open && <div id={contentId} style={contentStyle}>{children}</div>}
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  borderTop: '1px solid var(--color-border-default, #d0d7de)',
  marginTop: '16px',
  paddingTop: '4px',
};

const toggleStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 0',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  width: '100%',
};

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '18px',
  height: '18px',
  padding: '0 5px',
  fontSize: '11px',
  fontWeight: 600,
  color: 'var(--color-accent-fg, #0969da)',
  backgroundColor: 'var(--color-accent-bg, #ddf4ff)',
  borderRadius: '9px',
};

const contentStyle: React.CSSProperties = {
  paddingTop: '4px',
};
