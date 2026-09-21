import React, { useMemo, useCallback, useEffect, useRef } from 'react';
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

import BusbarNode from '../nodes/BusbarNode';
import ProsumerNode from '../nodes/ProsumerNode';
import ConsumerNode from '../nodes/ConsumerNode';
import GridNode from '../nodes/GridNode';
import SolarFarmNode from '../nodes/SolarFarmNode';
import BESSNode from '../nodes/BESSNode';
import TradeEdge from '../edges/TradeEdge';
import P2PFinancialEdge from '../edges/P2PFinancialEdge';
import AddNodeModal from './AddNodeModal';
import { useGridStore } from '../../store/gridStore';
import { distributeNodesOnBus, DEFAULT_BUSBAR_POSITION, DEFAULT_BUSBAR_WIDTH } from '../../utils/layoutUtils';
import { Home, Building2, Radio, Factory, Layers, Zap, LayoutGrid } from 'lucide-react';

const nodeTypes = {
  BusbarNode,
  busbar: BusbarNode,
  ProsumerNode,
  ConsumerNode,
  GridNode,
  SolarFarmNode,
  BESSNode
};

const edgeTypes = {
  tradeEdge: TradeEdge,
  p2p_financial: P2PFinancialEdge,
  P2PFinancialEdge: P2PFinancialEdge
};

export default function GridMap() {
  const nodes = useGridStore((state) => state.nodes);
  const activeTrades = useGridStore((state) => state.activeTrades);
  const activeGridTransfers = useGridStore((state) => state.activeGridTransfers);
  const customConnections = useGridStore((state) => state.customConnections);
  const updateConnection = useGridStore((state) => state.updateConnection);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);
  const updateNodePosition = useGridStore((state) => state.updateNodePosition);
  const gridPhysics = useGridStore((state) => state.gridPhysics);

  // React Flow state hooks
  const [flowNodes, setFlowNodes, onNodesChangeReactFlow] = useNodesState([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState([]);
  const edgeUpdateSuccessful = useRef(true);
  const initialLayoutDone = useRef(false);

  // Synchronize incoming telemetry with React Flow nodes while keeping movable busbar and agent positions
  useEffect(() => {
    setFlowNodes((prevNodes) => {
      const prevPositionMap = new Map(prevNodes.map((n) => [n.id, n.position]));
      const busbarFlowNode = prevNodes.find((n) => n.id === 'central-busbar');
      const prevBusbarPos = busbarFlowNode?.position || DEFAULT_BUSBAR_POSITION;
      const busbarWidth = busbarFlowNode?.data?.width || DEFAULT_BUSBAR_WIDTH;

      // Compute auto-distribution if needed
      const autoPositions = distributeNodesOnBus(nodes, prevBusbarPos, busbarWidth);

      // 1. Central Busbar node (movable & resizable with live transformer load gauge)
      const busbarNode = {
        id: 'central-busbar',
        type: 'BusbarNode',
        position: prevBusbarPos,
        data: {
          name: 'Main Distribution Busbar',
          width: busbarWidth,
          transformerLoadKW: gridPhysics?.transformerLoadKW ?? 0,
          thermalLimitKW: gridPhysics?.thermalLimitKW ?? 100,
          isCongested: gridPhysics?.isCongested ?? false
        },
        draggable: true,
        selectable: true,
        deletable: false,
        zIndex: 0
      };

      // 2. Position agent nodes
      const agentFlowNodes = nodes.map((node) => {
        const category = node.category || (node.type ? node.type.replace('Node', '') : 'Prosumer');
        const autoPos = autoPositions.get(node.id) || { x: 300, y: 300 };
        const currentPos = prevPositionMap.get(node.id) || node.position || autoPos;

        return {
          id: node.id,
          type: node.type || `${category}Node`,
          position: currentPos,
          data: node,
          selected: selectedNodeId === node.id,
          draggable: true,
          zIndex: 5
        };
      });

      return [busbarNode, ...agentFlowNodes];
    });
  }, [nodes, selectedNodeId, setFlowNodes]);

  // Handle node drag and resize changes and persist to store
  const handleNodesChange = useCallback(
    (changes) => {
      setFlowNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        // If busbar was resized, update width in data
        changes.forEach((change) => {
          if (change.type === 'dimensions' && change.id === 'central-busbar' && change.dimensions?.width) {
            const busNode = updated.find((n) => n.id === 'central-busbar');
            if (busNode) {
              busNode.data = { ...busNode.data, width: Math.max(500, Math.round(change.dimensions.width)) };
            }
          }
        });
        return updated;
      });

      changes.forEach((change) => {
        if (change.type === 'position' && change.position && change.id) {
          if (change.id !== 'central-busbar') {
            updateNodePosition(change.id, change.position);
          }
        }
      });
    },
    [setFlowNodes, updateNodePosition]
  );

  // Manual Trigger to re-distribute all nodes on the bus
  const handleAutoDistribute = useCallback(() => {
    setFlowNodes((prevNodes) => {
      const busbarFlowNode = prevNodes.find((n) => n.id === 'central-busbar');
      const busbarPos = busbarFlowNode?.position || DEFAULT_BUSBAR_POSITION;
      const busbarWidth = busbarFlowNode?.data?.width || DEFAULT_BUSBAR_WIDTH;
      const autoPositions = distributeNodesOnBus(nodes, busbarPos, busbarWidth);

      return prevNodes.map((n) => {
        if (n.id === 'central-busbar') return n;
        const newPos = autoPositions.get(n.id);
        if (newPos) {
          updateNodePosition(n.id, newPos);
          return { ...n, position: newPos };
        }
        return n;
      });
    });
  }, [nodes, setFlowNodes, updateNodePosition]);

  // Edge Reconnection Handlers (Allow users to drag terminal points to any handle on the busbar)
  const onEdgeUpdateStart = useCallback(() => {
    edgeUpdateSuccessful.current = false;
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => {
      edgeUpdateSuccessful.current = true;
      updateConnection(oldEdge.id, newConnection);
      setFlowEdges((els) =>
        els.map((edge) => (edge.id === oldEdge.id ? { ...edge, ...newConnection } : edge))
      );
    },
    [updateConnection, setFlowEdges]
  );

  const onEdgeUpdateEnd = useCallback((_, edge) => {
    if (!edgeUpdateSuccessful.current) {
      console.log('Edge update cancelled or dropped outside handle');
    }
    edgeUpdateSuccessful.current = true;
  }, []);

  // Generate dual edge routing: Dynamic physical transfer flows + Direct P2P financial arcs
  const calculatedEdges = useMemo(() => {
    const edges = [];
    const busbarFlowNode = flowNodes.find((n) => n.id === 'central-busbar');
    const busPos = busbarFlowNode?.position || DEFAULT_BUSBAR_POSITION;
    const busWidth = busbarFlowNode?.data?.width || DEFAULT_BUSBAR_WIDTH;
    const slotCount = 24;

    // 1. Static & Dynamic Physical Transmission Infrastructure
    nodes.forEach((node) => {
      const edgeId = `physical-${node.id}-busbar`;
      const customConn = customConnections[edgeId];
      const activeTransfer = activeGridTransfers[node.id];

      // Retrieve live node position to compute nearest-point snapping
      const liveNode = flowNodes.find((n) => n.id === node.id);
      const nodePos = liveNode?.position || node.position || { x: 300, y: 300 };
      const isGrid = node.id === 'grid-main' || node.category === 'UtilityGrid' || node.type === 'GridNode';

      // Dynamic Grid Transfer Styles:
      // Exporting (Power to Bus) = Glowing Green (#22c55e)
      // Importing (Power from Bus) = Glowing Orange/Red (#f97316)
      // Idle = Semi-transparent dark blue line
      let strokeColor = 'rgba(56, 189, 248, 0.4)';
      let strokeWidth = 2;
      let strokeDash = '4 4';
      let isAnimated = false;
      let filter = undefined;

      if (activeTransfer) {
        isAnimated = true;
        strokeDash = undefined;
        if (activeTransfer.type === 'EXPORT') {
          strokeColor = '#22c55e';
          strokeWidth = 3.5;
          filter = 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.85))';
        } else {
          strokeColor = '#f97316';
          strokeWidth = 3.5;
          filter = 'drop-shadow(0 0 10px rgba(249, 115, 22, 0.85))';
        }
      } else if (isGrid) {
        strokeColor = 'rgba(129, 140, 248, 0.8)';
        strokeWidth = 2.5;
        strokeDash = undefined;
      }

      // Smart Nearest-Point Snapping Math (Eliminate diagonal crossovers & side loops)
      let sourceHandleId = customConn?.sourceHandle;
      let targetHandleId = customConn?.targetHandle;

      if (!sourceHandleId || !targetHandleId) {
        if (isGrid) {
          sourceHandleId = sourceHandleId || 'left';
          targetHandleId = targetHandleId || 'right';
        } else {
          const nodeCenterX = nodePos.x + 128; // Center of 256px node
          const fraction = (nodeCenterX - busPos.x) / busWidth;
          const clamped = Math.max(0, Math.min(1, fraction));
          const nearestSlot = Math.min(slotCount - 1, Math.max(0, Math.floor(clamped * slotCount)));

          if (nodePos.y < busPos.y) {
            // Node is above bus: route from bottom of node to top of busbar
            sourceHandleId = sourceHandleId || 'bottom';
            targetHandleId = targetHandleId || `top-${nearestSlot}`;
          } else {
            // Node is below bus: route from top of node to bottom of busbar
            sourceHandleId = sourceHandleId || 'top';
            targetHandleId = targetHandleId || `bottom-${nearestSlot}`;
          }
        }
      }

      edges.push({
        id: edgeId,
        source: node.id,
        sourceHandle: sourceHandleId,
        target: 'central-busbar',
        targetHandle: targetHandleId,
        type: 'smoothstep',
        pathOptions: { borderRadius: 6 },
        reconnectable: true,
        style: {
          stroke: strokeColor,
          strokeWidth,
          strokeDasharray: strokeDash,
          filter
        },
        animated: isAnimated,
        zIndex: isAnimated ? 20 : 1
      });
    });

    // 2. Direct P2P Financial Contract Arcs (Fly over physical infrastructure with zIndex: 1000)
    activeTrades.forEach((trade) => {
      if (trade.type === 'P2P') {
        edges.push({
          id: trade.id,
          source: trade.source,
          target: trade.target,
          type: 'p2p_financial',
          data: trade,
          animated: false,
          zIndex: 1000
        });
      }
    });

    return edges;
  }, [nodes, flowNodes, activeTrades, activeGridTransfers, customConnections]);

  useEffect(() => {
    setFlowEdges(calculatedEdges);
  }, [calculatedEdges, setFlowEdges]);

  return (
    <div className="relative w-full h-full bg-[#080b12]">
      {/* Dynamic Deploy Agent FAB & Modal */}
      <AddNodeModal />

      {/* Auto-Align Layout Button */}
      <div className="absolute top-4 right-4 z-10 flex items-center space-x-2">
        <button
          onClick={handleAutoDistribute}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/30 text-cyan-300 text-xs font-medium shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Auto-Distribute Nodes Above and Below Busbar"
        >
          <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
          <span>Auto-Layout Bus</span>
        </button>
      </div>

      {/* Interactive React Flow Canvas */}
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        edgesReconnectable={true}
        nodesDraggable={true}
        elementsSelectable={true}
        fitView
        fitViewOptions={{ padding: 0.12 }}
        minZoom={0.35}
        maxZoom={1.6}
        defaultViewport={{ x: 0, y: 0, zoom: 0.85 }}
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
            if (node.type === 'BusbarNode') return '#06b6d4';
            if (node.type === 'ProsumerNode') return '#10b981';
            if (node.type === 'ConsumerNode') return '#f97316';
            if (node.type === 'SolarFarmNode') return '#f59e0b';
            if (node.type === 'BESSNode') return '#a855f7';
            return '#6366f1';
          }}
          maskColor="rgba(8, 11, 18, 0.85)"
          className="!bg-slate-950/80 !border !border-slate-800 !rounded-xl overflow-hidden"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>

      {/* Quick HUD Legend & Topology Indicator */}
      <div className="absolute bottom-4 left-4 z-10 glass-card px-3.5 py-2 rounded-xl border border-slate-800 text-[11px] font-mono flex items-center space-x-3 pointer-events-auto backdrop-blur-md">
        <div className="flex items-center space-x-1.5 text-cyan-400 font-bold border-r border-slate-800 pr-3">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Bus SLD Topology</span>
        </div>
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
          <span>BESS</span>
        </div>
        <div className="flex items-center space-x-1.5 text-indigo-400">
          <Radio className="w-3.5 h-3.5" />
          <span>Substation</span>
        </div>
      </div>
    </div>
  );
}
