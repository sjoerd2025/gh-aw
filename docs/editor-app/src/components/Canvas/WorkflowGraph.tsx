import { useMemo, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';

import { useUIStore } from '../../stores/uiStore';
import { TriggerNode } from '../Nodes/TriggerNode';
import { EngineNode } from '../Nodes/EngineNode';
import { ToolsNode } from '../Nodes/ToolsNode';
import { InstructionsNode } from '../Nodes/InstructionsNode';
import { SafeOutputsNode } from '../Nodes/SafeOutputsNode';
import { NetworkNode } from '../Nodes/NetworkNode';
import { SettingsNode } from '../Nodes/SettingsNode';
import { StepsNode } from '../Nodes/StepsNode';
import { EmptyState } from './EmptyState';
import { useWorkflowStore } from '../../stores/workflowStore';
import type { WorkflowNodeData } from '../../types/nodes';
import '../../styles/nodes.css';

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  engine: EngineNode,
  tools: ToolsNode,
  instructions: InstructionsNode,
  safeOutputs: SafeOutputsNode,
  network: NetworkNode,
  settings: SettingsNode,
  steps: StepsNode,
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 120;

interface NodeDef {
  id: string;
  type: string;
  label: string;
  description: string;
  isRequired: boolean;
  isConfigured: (state: ReturnType<typeof useWorkflowStore.getState>) => boolean;
}

const ALL_NODES: NodeDef[] = [
  {
    id: 'trigger',
    type: 'trigger',
    label: 'When this happens',
    description: 'Choose what starts this workflow',
    isRequired: true,
    isConfigured: (s) => s.trigger.event !== '',
  },
  {
    id: 'engine',
    type: 'engine',
    label: 'AI Assistant',
    description: 'Choose which AI runs this',
    isRequired: true,
    isConfigured: (s) => s.engine.type !== '',
  },
  {
    id: 'tools',
    type: 'tools',
    label: 'Agent Tools',
    description: 'What tools the agent can use',
    isRequired: false,
    isConfigured: (s) => s.tools.length > 0,
  },
  {
    id: 'instructions',
    type: 'instructions',
    label: 'Instructions',
    description: 'Tell the agent what to do',
    isRequired: true,
    isConfigured: (s) => s.instructions.trim().length > 0,
  },
  {
    id: 'safeOutputs',
    type: 'safeOutputs',
    label: 'What it can do',
    description: 'Actions the agent can take',
    isRequired: false,
    isConfigured: (s) => Object.keys(s.safeOutputs).length > 0,
  },
  {
    id: 'network',
    type: 'network',
    label: 'Network Access',
    description: 'Allowed network domains',
    isRequired: false,
    isConfigured: (s) =>
      s.network.allowed.length > 0 || s.network.blocked.length > 0,
  },
  {
    id: 'settings',
    type: 'settings',
    label: 'Settings',
    description: 'Concurrency, rate limits, platform',
    isRequired: false,
    isConfigured: (s) =>
      s.platform !== '' ||
      (s.concurrency?.group ?? '') !== '' ||
      (s.concurrency?.cancelInProgress ?? false) ||
      (s.rateLimit?.max ?? '') !== '' ||
      (s.rateLimit?.window ?? '') !== '',
  },
  {
    id: 'steps',
    type: 'steps',
    label: 'Custom Steps',
    description: 'Additional workflow steps',
    isRequired: false,
    isConfigured: () => false,
  },
];

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 60 });

  nodes.forEach((node) => {
    g.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  dagre.layout(g);

  const layoutedNodes = nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

export function WorkflowGraph() {
  const state = useWorkflowStore();
  const selectNode = useWorkflowStore((s) => s.selectNode);
  const theme = useUIStore((s) => s.theme);

  // Resolve effective color mode (auto → system preference)
  const isDark = theme === 'dark' || (theme === 'auto' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const colorMode = isDark ? 'dark' : 'light';

  // Determine which nodes to show: required nodes + configured optional nodes
  const visibleNodeDefs = useMemo(() => {
    return ALL_NODES.filter((def) => def.isRequired || def.isConfigured(state));
  }, [state]);

  // Build React Flow nodes
  const rawNodes: Node<WorkflowNodeData>[] = useMemo(() => {
    return visibleNodeDefs.map((def) => ({
      id: def.id,
      type: def.type,
      position: { x: 0, y: 0 },
      data: {
        label: def.label,
        type: def.type as WorkflowNodeData['type'],
        description: def.description,
        isConfigured: def.isConfigured(state),
      },
    }));
  }, [visibleNodeDefs, state]);

  // Build edges connecting sequential nodes
  const rawEdges: Edge[] = useMemo(() => {
    return visibleNodeDefs.slice(1).map((def, i) => ({
      id: `e-${visibleNodeDefs[i].id}-${def.id}`,
      source: visibleNodeDefs[i].id,
      target: def.id,
      animated: true,
      style: { stroke: 'var(--borderColor-default, #d1d9e0)' },
    }));
  }, [visibleNodeDefs]);

  // Apply dagre layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(
    () => getLayoutedElements(rawNodes, rawEdges),
    [rawNodes, rawEdges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  // Sync layout when nodes change
  useMemo(() => {
    setNodes(layoutedNodes);
  }, [layoutedNodes, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const onPaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  if (visibleNodeDefs.length === 0) {
    return <EmptyState />;
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={onNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      colorMode={colorMode}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.3}
      maxZoom={1.5}
      proOptions={{ hideAttribution: true }}
    >
      <Background
        variant={BackgroundVariant.Dots}
        gap={16}
        size={1}
        color={isDark ? '#30363d' : undefined}
      />
      <Controls position="bottom-left" />
      <MiniMap
        position="bottom-left"
        style={{ marginBottom: 50 }}
        nodeStrokeWidth={3}
        maskColor={isDark ? 'rgba(0, 0, 0, 0.6)' : undefined}
        pannable
        zoomable
      />
    </ReactFlow>
  );
}
