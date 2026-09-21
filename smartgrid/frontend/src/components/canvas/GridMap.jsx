import React, { useMemo, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  applyNodeChanges
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ProsumerNode from '../nodes/ProsumerNode';
import ConsumerNode from '../nodes/ConsumerNode';
import GridNode from '../nodes/GridNode';
import SolarFarmNode from '../nodes/SolarFarmNode';
import BESSNode from '../nodes/BESSNode';
import TradeEdge from '../edges/TradeEdge';
import AddNodeModal from './AddNodeModal';
import { useGridStore } from '../../store/gridStore';
import { Home, Building2, Radio, Factory, Layers } from 'lucide-react';

const nodeTypes = {
  ProsumerNode,
  ConsumerNode,
  GridNode,
  SolarFarmNode,
  BESSNode
};

const edgeTypes = {
  tradeEdge: TradeEdge
};

export default function GridMap() {
  const nodes = useGridStore((state) => state.nodes);
  const activeTrades = useGridStore((state) => state.activeTrades);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const updateNodePosition = useGridStore((state) => state.updateNodePosition);

  // React Flow state hooks
  const [flowNodes, setFlowNodes, onNodesChangeReactFlow] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);

  // Synchronize incoming telemetry with React Flow node list while preserving dragged positions
  useEffect(() => {
    setFlowNodes((prevNodes) => {
      const prevPositionMap = new Map(prevNodes.map((n) => [n.id, n.position]));

      return nodes.map((node) => {
        // Fallback or preserved position
        const currentPos = prevPositionMap.get(node.id) || node.position || { x: 300, y: 300 };

        return {
          id: node.id,
          type: node.type || `${node.category}Node`,
          position: currentPos,
          data: node,
          selected: selectedNodeId === node.id,
          draggable: true
        };
      });
    });
  }, [nodes, selectedNodeId, setFlowNodes]);

  // Handle node drag changes and persist to store
  const handleNodesChange = useCallback(
    (changes) => {
      setFlowNodes((nds) => applyNodeChanges(changes, nds));

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.id) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [setFlowNodes, updateNodePosition]
  );

  // Generate topology edges + dynamic active trade routes
  const calculatedEdges = useMemo(() => {
    const edges = [];
    const gridNode = nodes.find((n) => n.id === 'grid-main');

    // 1. Static physical transmission lines (grid backbone)
    if (gridNode) {
      nodes.forEach((node) => {
        if (node.id !== 'grid-main') {
          edges.push({
            id: `topology-${node.id}-grid-main`,
            source: 'grid-main',
            target: node.id,
            type: 'default',
            style: {
              stroke: 'rgba(51, 65, 85, 0.35)',
              strokeWidth: 1.5,
              strokeDasharray: '4 4'
            },
            animated: false
          });
        }
      });
    }

    // 2. Active trade routes (P2P bilateral & Grid imports/feed-ins)
    activeTrades.forEach((trade) => {
      edges.push({
        id: `active-${trade.source}-${trade.target}`,
        source: trade.source,
        target: trade.target,
        type: 'tradeEdge',
        data: trade,
        animated: true,
        zIndex: 10
      });
    });

    return edges;
  }, [nodes, activeTrades]);

  useEffect(() => {
    setFlowEdges(calculatedEdges);
  }, [calculatedEdges, setFlowEdges]);

  return (
    <div className="relative w-full h-full bg-[#080b12]">
      {/* Dynamic Deploy Agent FAB & Modal */}
      <AddNodeModal />

      {/* Interactive React Flow Canvas */}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        nodesDraggable={true}
        elementsSelectable={true}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.4}
        maxZoom={1.6}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color="rgba(148, 163, 184, 0.12)"
        />
        <Controls
          className="!bg-slate-900/90 !border-slate-800 !text-slate-300"
          showInteractive={false}
        />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'ProsumerNode') return '#10b981';
            if (node.type === 'ConsumerNode') return '#f97316';
            if (node.type === 'SolarFarmNode') return '#f59e0b';
            if (node.type === 'BESSNode') return '#a855f7';
            return '#06b6d4';
          }}
          maskColor="rgba(8, 11, 18, 0.85)"
          className="!bg-slate-950/80 !border !border-slate-800 !rounded-xl overflow-hidden"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>

      {/* Quick HUD Legend */}
      <div className="absolute bottom-4 left-4 z-10 glass-card px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono flex items-center space-x-3 pointer-events-auto backdrop-blur-md">
        <div className="flex items-center space-x-1.5 text-emerald-400">
          <Home className="w-3.5 h-3.5" />
          <span>Prosumer</span>
        </div>
        <div className="flex items-center space-x-1.5 text-orange-400">
          <Building2 className="w-3.5 h-3.5" />
          <span>Consumer</span>
        </div>
        <div className="flex items-center space-x-1.5 text-amber-400">
          <Factory className="w-3.5 h-3.5" />
          <span>Solar Farm</span>
        </div>
        <div className="flex items-center space-x-1.5 text-purple-400">
          <Layers className="w-3.5 h-3.5" />
          <span>BESS Storage</span>
        </div>
        <div className="flex items-center space-x-1.5 text-cyan-400">
          <Radio className="w-3.5 h-3.5" />
          <span>Utility Grid</span>
        </div>
      </div>
    </div>
  );
}
