import { Sun, Moon, Monitor } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

type ThemeOption = 'light' | 'dark' | 'auto';

const options: { value: ThemeOption; icon: typeof Sun; label: string }[] = [
  { value: 'light', icon: Sun, label: 'Light' },
  { value: 'dark', icon: Moon, label: 'Dark' },
  { value: 'auto', icon: Monitor, label: 'System' },
];

export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  return (
    <div style={containerStyle} role="radiogroup" aria-label="Theme">
      {options.map(({ value, icon: Icon, label }) => {
        const active = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            style={{
              ...buttonStyle,
              ...(active ? activeStyle : {}),
            }}
          >
            <Icon size={14} aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  border: '1px solid var(--color-border-default, #d0d7de)',
  borderRadius: 8,
  overflow: 'hidden',
  background: 'var(--color-bg-subtle, #f6f8fa)',
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 30,
  height: 28,
  border: 'none',
  background: 'transparent',
  color: 'var(--color-fg-muted, #656d76)',
  cursor: 'pointer',
  transition: 'background 0.15s ease, color 0.15s ease',
  padding: 0,
};

const activeStyle: React.CSSProperties = {
  background: 'var(--color-bg-default, #ffffff)',
  color: 'var(--color-fg-default, #1f2328)',
  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
};
