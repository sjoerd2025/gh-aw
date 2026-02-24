import { useState } from 'react';
import {
  Bell,
  Bot,
  Wrench,
  FileText,
  Send,
  Globe,
  Settings,
  List,
  type LucideIcon,
} from 'lucide-react';
import { useWorkflowStore } from '../../stores/workflowStore';
import type { WorkflowNodeType } from '../../types/nodes';

interface PaletteItem {
  type: WorkflowNodeType;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  category: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'trigger', label: 'Trigger', description: 'When to run this workflow', icon: Bell, color: '#2da44e', category: 'Triggers' },
  { type: 'engine', label: 'AI Assistant', description: 'Choose which AI to use', icon: Bot, color: '#0969da', category: 'Agent' },
  { type: 'tools', label: 'Tools', description: 'Capabilities for the agent', icon: Wrench, color: '#8250df', category: 'Agent' },
  { type: 'instructions', label: 'Instructions', description: 'Tell the agent what to do', icon: FileText, color: '#57606a', category: 'Agent' },
  { type: 'safeOutputs', label: 'Safe Outputs', description: 'Actions the agent can take', icon: Send, color: '#1a7f37', category: 'Outputs' },
  { type: 'network', label: 'Network', description: 'Internet access control', icon: Globe, color: '#cf222e', category: 'Advanced' },
  { type: 'settings', label: 'Settings', description: 'Concurrency, rate limits, platform', icon: Settings, color: '#57606a', category: 'Advanced' },
  { type: 'steps', label: 'Custom Steps', description: 'Pre/post agent steps', icon: List, color: '#0550ae', category: 'Advanced' },
];

const CATEGORIES = ['Triggers', 'Agent', 'Outputs', 'Advanced'];

const CATEGORY_COLORS: Record<string, string> = {
  Triggers: '#2da44e',
  Agent: '#8250df',
  Outputs: '#1a7f37',
  Advanced: '#57606a',
};

export function NodePalette() {
  const selectNode = useWorkflowStore((s) => s.selectNode);

  const handleClick = (type: WorkflowNodeType) => {
    selectNode(type);
  };

  return (
    <div style={{ padding: '12px 0' }}>
      {CATEGORIES.map((category) => {
        const items = PALETTE_ITEMS.filter((item) => item.category === category);
        if (items.length === 0) return null;

        return (
          <div key={category} style={{ marginBottom: 16 }}>
            <div style={{
              padding: '4px 16px 6px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: 0.5,
              color: CATEGORY_COLORS[category] || 'var(--color-fg-muted, #656d76)',
            }}>
              {category}
            </div>
            {items.map((item) => (
              <PaletteItemRow
                key={item.type}
                item={item}
                onClick={() => handleClick(item.type)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function PaletteItemRow({
  item,
  onClick,
}: {
  item: PaletteItem;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: 'calc(100% - 16px)',
        margin: '0 8px 2px',
        padding: '8px 8px',
        border: 'none',
        borderLeft: `3px solid ${hovered ? item.color : 'transparent'}`,
        background: hovered ? 'var(--color-bg-subtle, #f6f8fa)' : 'none',
        cursor: 'pointer',
        textAlign: 'left' as const,
        borderRadius: '0 6px 6px 0',
        color: 'var(--color-fg-default, #1f2328)',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
        borderRadius: 6,
        background: `color-mix(in srgb, ${item.color} 12%, transparent)`,
        color: item.color,
        flexShrink: 0,
        transition: 'transform 0.15s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}>
        <Icon size={16} />
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-fg-default, #1f2328)' }}>{item.label}</div>
        <div style={{
          fontSize: 11,
          color: 'var(--color-fg-muted, #656d76)',
          lineHeight: 1.3,
        }}>
          {item.description}
        </div>
      </div>
    </button>
  );
}
