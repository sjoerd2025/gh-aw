import { useState } from 'react';
import { NodePalette } from './NodePalette';
import { TemplateGallery } from './TemplateGallery';
import { ComponentLibrary } from './ComponentLibrary';
import { useUIStore } from '../../stores/uiStore';

export function Sidebar() {
  const activeTab = useUIStore((s) => s.sidebarTab);
  const setActiveTab = useUIStore((s) => s.setSidebarTab);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'var(--color-bg-default, #ffffff)',
    }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border-default, #d0d7de)',
        flexShrink: 0,
      }}>
        <TabButton
          label="Blocks"
          active={activeTab === 'palette'}
          onClick={() => setActiveTab('palette')}
        />
        <TabButton
          label="Templates"
          active={activeTab === 'templates'}
          onClick={() => setActiveTab('templates')}
          dataTourTarget="templates"
        />
        <TabButton
          label="Imports"
          active={activeTab === 'components'}
          onClick={() => setActiveTab('components')}
        />
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {activeTab === 'palette' && <NodePalette />}
        {activeTab === 'templates' && <TemplateGallery />}
        {activeTab === 'components' && <ComponentLibrary />}
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  dataTourTarget,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  dataTourTarget?: string;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      data-tour-target={dataTourTarget}
      style={{
        flex: '1 1 0',
        minWidth: 0,
        padding: '8px 4px',
        fontSize: 12,
        fontWeight: active ? 600 : 400,
        border: 'none',
        borderBottom: active
          ? '2px solid var(--color-accent-fg, #0969da)'
          : '2px solid transparent',
        background: hovered && !active ? 'var(--color-bg-subtle, #f6f8fa)' : 'none',
        color: active
          ? 'var(--color-fg-default, #1f2328)'
          : 'var(--color-fg-muted, #656d76)',
        cursor: 'pointer',
        transition: 'color 0.15s ease, border-color 0.15s ease, background 0.15s ease',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}
