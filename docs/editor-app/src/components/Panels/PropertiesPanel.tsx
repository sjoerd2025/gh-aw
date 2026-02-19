import { useWorkflowStore } from '../../stores/workflowStore';
import { TriggerPanel } from './TriggerPanel';
import { EnginePanel } from './EnginePanel';
import { ToolsPanel } from './ToolsPanel';
import { PermissionsPanel } from './PermissionsPanel';
import { InstructionsPanel } from './InstructionsPanel';
import { SafeOutputsPanel } from './SafeOutputsPanel';
import { NetworkPanel } from './NetworkPanel';
import { StepsPanel } from './StepsPanel';
import { X } from 'lucide-react';

const panelMap: Record<string, React.FC> = {
  trigger: TriggerPanel,
  permissions: PermissionsPanel,
  engine: EnginePanel,
  tools: ToolsPanel,
  instructions: InstructionsPanel,
  safeOutputs: SafeOutputsPanel,
  network: NetworkPanel,
  steps: StepsPanel,
};

export function PropertiesPanel() {
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const selectNode = useWorkflowStore((s) => s.selectNode);

  if (!selectedNodeId) {
    return (
      <div className="panel panel--empty">
        <p style={{ color: 'var(--fgColor-muted, #656d76)', fontSize: 14, textAlign: 'center', padding: 32 }}>
          Select a block on the canvas to configure it
        </p>
      </div>
    );
  }

  const PanelComponent = panelMap[selectedNodeId];

  if (!PanelComponent) {
    return (
      <div className="panel">
        <p style={{ color: 'var(--fgColor-muted, #656d76)', fontSize: 14, padding: 16 }}>
          No configuration available for this block.
        </p>
      </div>
    );
  }

  return (
    <div className="panel-wrapper">
      <button
        className="panel__close-btn"
        onClick={() => selectNode(null)}
        title="Close panel"
        style={{
          position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
          cursor: 'pointer', padding: 4, borderRadius: 4, color: 'var(--fgColor-muted, #656d76)',
          zIndex: 1,
        }}
      >
        <X size={16} />
      </button>
      <PanelComponent />
    </div>
  );
}
