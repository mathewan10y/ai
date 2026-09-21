import React, { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import ProsumerNode from '../nodes/ProsumerNode';
import ConsumerNode from '../nodes/ConsumerNode';
import GridNode from '../nodes/GridNode';
import TradeEdge from '../edges/TradeEdge';
import { useGridStore } from '../../store/gridStore';

const nodeTypes = {
  ProsumerNode,
  ConsumerNode,
  GridNode
};

const edgeTypes = {
  tradeEdge: TradeEdge
};

export default function GridMap() {
  const nodes = useGridStore((state) => state.nodes);
  const activeTrades = useGridStore((state) => state.activeTrades);
  const selectedNodeId = useGridStore((state) => state.selectedNodeId);

  // Convert raw node objects to React Flow node format
  const flowNodes = useMemo(() => {
    return nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position || { x: 0, y: 0 },
      data: node,
      selected: selectedNodeId === node.id
    }));
  }, [nodes, selectedNodeId]);

  // Generate topology edges + dynamic active trade edges
  const flowEdges = useMemo(() => {
    const edges = [];
    const gridNode = nodes.find((n) => n.id === 'grid-main');

    // 1. Static physical transmission lines (subtle grid backbone)
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

  return (
    <div className="relative w-full h-full bg-[#080b12]">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.5}
        maxZoom={1.5}
        defaultViewport={{ x: 0, y: 0, zoom: 0.95 }}
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
            return '#06b6d4';
          }}
          maskColor="rgba(8, 11, 18, 0.85)"
          className="!bg-slate-950/80 !border !border-slate-800 !rounded-xl overflow-hidden"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>
    </div>
  );
}
