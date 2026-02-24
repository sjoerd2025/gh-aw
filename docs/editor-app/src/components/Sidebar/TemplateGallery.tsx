import { useState } from 'react';
import {
  Inbox,
  Wrench,
  Book,
  Activity,
  Terminal,
  TestTube,
  Plus,
  Shield,
  ClipboardCheck,
  Zap,
  BarChart,
  MessageCircle,
  ListChecks,
  GraduationCap,
  BookOpen,
  Scissors,
  type LucideIcon,
} from 'lucide-react';
import { toast } from '../../utils/lazyToast';
import { useWorkflowStore } from '../../stores/workflowStore';
import { templates, templateCategories } from '../../utils/templates';
import type { WorkflowTemplate } from '../../types/workflow';

const ICON_MAP: Record<string, LucideIcon> = {
  inbox: Inbox,
  wrench: Wrench,
  book: Book,
  activity: Activity,
  terminal: Terminal,
  'test-tube': TestTube,
  plus: Plus,
  shield: Shield,
  'clipboard-check': ClipboardCheck,
  zap: Zap,
  'bar-chart': BarChart,
  'message-circle': MessageCircle,
  'list-checks': ListChecks,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  scissors: Scissors,
};

export function TemplateGallery() {
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate);

  const handleSelect = (template: WorkflowTemplate) => {
    loadTemplate(template);
    toast.success(`Loaded "${template.name}" template`);
  };

  return (
    <div style={{ padding: 12 }}>
      {templateCategories.map((category) => {
        const items = templates.filter((t) => t.category === category);
        if (items.length === 0) return null;
        return (
          <div key={category} style={{ marginBottom: 16 }}>
            <div style={{
              padding: '4px 4px 6px',
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase' as const,
              letterSpacing: 0.5,
              color: 'var(--color-fg-muted, #656d76)',
            }}>
              {category}
            </div>
            {items.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleSelect(template)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

function TemplateCard({
  template,
  onSelect,
}: {
  template: WorkflowTemplate;
  onSelect: () => void;
}) {
  const Icon = ICON_MAP[template.icon] || Plus;
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        gap: 10,
        width: '100%',
        padding: 10,
        marginBottom: 4,
        border: `1px solid ${hovered ? 'var(--color-fg-subtle, #6e7781)' : 'var(--color-border-default, #d0d7de)'}`,
        borderRadius: 8,
        background: hovered ? 'var(--color-bg-subtle, #f6f8fa)' : 'var(--color-bg-default, #ffffff)',
        cursor: 'pointer',
        textAlign: 'left' as const,
        boxShadow: hovered ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
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
        background: 'var(--color-bg-muted, #eaeef2)',
        color: 'var(--color-fg-muted, #656d76)',
        flexShrink: 0,
        transition: 'transform 0.15s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
      }}>
        <Icon size={16} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--color-fg-default, #1f2328)',
          marginBottom: 2,
        }}>
          {template.name}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--color-fg-muted, #656d76)',
          lineHeight: 1.3,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as const,
        }}>
          {template.description}
        </div>
      </div>
    </button>
  );
}
