import { useWorkflowStore } from '../../stores/workflowStore';
import { PanelContainer } from './PanelContainer';
import { getFieldDescription } from '../../utils/fieldDescriptions';
import { HelpTooltip } from '../shared/HelpTooltip';
import { toolConfigPanels } from './ToolConfigPanels';
import { Settings } from 'lucide-react';
import type { ToolName } from '../../types/workflow';

interface ToolDef {
  name: ToolName;
  fieldKey: string;
}

interface ToolCategory {
  name: string;
  tools: ToolDef[];
}

const toolCategories: ToolCategory[] = [
  {
    name: 'Code & GitHub',
    tools: [
      { name: 'github', fieldKey: 'tool.github' },
      { name: 'edit', fieldKey: 'tool.edit' },
    ],
  },
  {
    name: 'Web',
    tools: [
      { name: 'web-fetch', fieldKey: 'tool.web-fetch' },
      { name: 'web-search', fieldKey: 'tool.web-search' },
      { name: 'playwright', fieldKey: 'tool.playwright' },
    ],
  },
  {
    name: 'System',
    tools: [
      { name: 'bash', fieldKey: 'tool.bash' },
      { name: 'cache-memory', fieldKey: 'tool.cache-memory' },
      { name: 'repo-memory', fieldKey: 'tool.repo-memory' },
    ],
  },
  {
    name: 'Workflow',
    tools: [
      { name: 'agentic-workflows', fieldKey: 'tool.agentic-workflows' },
      { name: 'serena', fieldKey: 'tool.serena' },
    ],
  },
];

export function ToolsPanel() {
  const tools = useWorkflowStore((s) => s.tools);
  const toolConfigs = useWorkflowStore((s) => s.toolConfigs);
  const toggleTool = useWorkflowStore((s) => s.toggleTool);
  const desc = getFieldDescription('tools');

  return (
    <PanelContainer title={desc.label} description={desc.description}>
      {toolCategories.map((cat) => (
        <div key={cat.name} className="panel__section">
          <div className="panel__section-title">{cat.name}</div>
          {cat.tools.map((t) => {
            const fd = getFieldDescription(t.fieldKey);
            const active = tools.includes(t.name);
            const ConfigPanel = toolConfigPanels[t.name];
            const hasConfig = toolConfigs[t.name] && Object.keys(toolConfigs[t.name]).length > 0;
            return (
              <div key={t.name}>
                <div
                  className={`tool-card ${active ? 'active' : ''}`}
                  onClick={() => toggleTool(t.name)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleTool(t.name); } }}
                  role="switch"
                  aria-checked={active}
                  aria-label={`${fd.label}: ${active ? 'enabled' : 'disabled'}`}
                  tabIndex={0}
                >
                  <div className="tool-card__info">
                    <div className="tool-card__name">
                      {fd.label}
                      {fd.tooltip && (
                        <span style={{ marginLeft: '6px' }}>
                          <HelpTooltip text={fd.tooltip} />
                        </span>
                      )}
                      {active && hasConfig && ConfigPanel != null && (
                        <Settings size={12} style={configuredIconStyle} aria-hidden="true" />
                      )}
                    </div>
                    <div className="tool-card__description">{fd.description}</div>
                  </div>
                  <div style={toggleStyle} aria-hidden="true">
                    <div style={{
                      ...toggleTrackStyle,
                      backgroundColor: active ? 'var(--color-accent-fg, #0969da)' : 'var(--color-border-default, #d0d7de)',
                    }}>
                      <div style={{
                        ...toggleThumbStyle,
                        transform: active ? 'translateX(16px)' : 'translateX(0)',
                      }} />
                    </div>
                  </div>
                </div>
                {active && ConfigPanel && <ConfigPanel />}
              </div>
            );
          })}
        </div>
      ))}
    </PanelContainer>
  );
}

const toggleStyle: React.CSSProperties = {
  flexShrink: 0,
  marginTop: '2px',
};

const toggleTrackStyle: React.CSSProperties = {
  width: '34px',
  height: '18px',
  borderRadius: '9px',
  position: 'relative',
  transition: 'background-color 150ms ease',
  cursor: 'pointer',
};

const toggleThumbStyle: React.CSSProperties = {
  width: '14px',
  height: '14px',
  borderRadius: '50%',
  backgroundColor: 'var(--color-bg-default, #ffffff)',
  position: 'absolute',
  top: '2px',
  left: '2px',
  transition: 'transform 150ms ease',
  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
};

const configuredIconStyle: React.CSSProperties = {
  marginLeft: '6px',
  color: 'var(--color-accent-fg, #0969da)',
  verticalAlign: 'middle',
};
