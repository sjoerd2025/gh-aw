import { useWorkflowStore } from '../../stores/workflowStore';
import { TriggerPanel } from './TriggerPanel';
import { EnginePanel } from './EnginePanel';
import { ToolsPanel } from './ToolsPanel';
import { InstructionsPanel } from './InstructionsPanel';
import { SafeOutputsPanel } from './SafeOutputsPanel';
import { NetworkPanel } from './NetworkPanel';
import { SettingsPanel } from './SettingsPanel';
import { StepsPanel } from './StepsPanel';
import { ErrorBoundary } from '../shared/ErrorBoundary';
import { X, MousePointer2 } from 'lucide-react';

const panelMap: Record<string, React.FC> = {
  trigger: TriggerPanel,
  engine: EnginePanel,
  tools: ToolsPanel,
  instructions: InstructionsPanel,
  safeOutputs: SafeOutputsPanel,
  network: NetworkPanel,
  settings: SettingsPanel,
  steps: StepsPanel,
};

export function PropertiesPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  if (!selectedNodeId) {
    return (
      <div className="panel panel--empty">
        <div style={{ textAlign: 'center', padding: 32 }}>
          <MousePointer2
            size={48}
            style={{
              color: 'var(--color-fg-muted, #656d76)',
              opacity: 0.35,
              marginBottom: 12,
            }}
          />
          <p style={{
            color: 'var(--color-fg-muted, #656d76)',
            fontSize: 14,
            lineHeight: 1.5,
          }}>
            Select a block on the canvas<br />to configure it
          </p>
        </div>
      </div>
    );
  }

  const PanelComponent = panelMap[selectedNodeId];

  if (!PanelComponent) {
    return (
      <div className="panel">
        <p style={{ color: 'var(--color-fg-muted, #656d76)', fontSize: 14, padding: 16 }}>
          No configuration available for this block.
        </p>
      </div>
    );
  }

  return (
    <div className="panel">
      <button
        className="panel__close-btn"
        onClick={() => selectNode(null)}
        title="Close panel"
        style={{
          position: 'absolute', top: 8, right: 8, background: 'none', border: 'none',
          cursor: 'pointer', padding: 4, borderRadius: 4,
          color: 'var(--color-fg-muted, #656d76)',
          transition: 'background 0.15s ease',
        }}
      >
        <X size={16} />
      </button>
      <ErrorBoundary>
        <PanelComponent />
      </ErrorBoundary>
    </div>
  );
}
