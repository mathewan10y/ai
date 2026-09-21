import React, { memo } from 'react';
import { getBezierPath, EdgeLabelRenderer, BaseEdge } from '@xyflow/react';

const TradeEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const isP2P = data?.type === 'P2P';
  const isFeedIn = data?.type === 'GRID_FEEDIN';
  const isImport = data?.type === 'GRID_IMPORT';

  let strokeColor = '#10b981'; // P2P Emerald
  let edgeClassName = 'p2p-edge-path';
  let badgeBg = 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50';

  if (isImport) {
    strokeColor = '#06b6d4'; // Cyan
    edgeClassName = 'grid-edge-path';
    badgeBg = 'bg-cyan-950/90 text-cyan-300 border-cyan-500/50';
  } else if (isFeedIn) {
    strokeColor = '#eab308'; // Amber
    edgeClassName = 'feedin-edge-path';
    badgeBg = 'bg-amber-950/90 text-amber-300 border-amber-500/50';
  }

  return (
    <>
      {/* Background thicker glow */}
      <BaseEdge
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 4,
          opacity: 0.3,
        }}
      />
      {/* Animated dashed line */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        className={edgeClassName}
        style={{
          ...style,
          stroke: strokeColor,
          strokeWidth: 2.5,
        }}
      />

      {/* Floating Trade Badge if active trade details exist */}
      {data?.amount && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className={`px-2 py-0.5 rounded-full border text-[10px] font-mono shadow-lg flex items-center space-x-1 backdrop-blur-md transition-all duration-300 ${badgeBg}`}
          >
            <span>⚡ {data.amount} kW</span>
            {data.price && <span className="opacity-75">(@${data.price})</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default memo(TradeEdge);
