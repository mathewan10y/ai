import React, { memo } from 'react';
import { getBezierPath } from '@xyflow/react';

/**
 * P2PFinancialEdge: Professional Floating Data Pill riding a Fiber Optic Pulse path.
 * 
 * Architectural Features:
 * 1. Fiber Optic Pulse Path: Animated flowing dash stream with electric gold (#eab308) glow.
 * 2. Floating Data Pill: Dark data card (kW volume & price) traversing the curve via <animateMotion>.
 * 3. Centered & Upright: Perfectly centered on the curve coordinate (x="-75", y="-16") and upright for readability.
 * 4. Ephemeral Lifecycle: 1.8s duration synchronized with state cleanup.
 */
const P2PFinancialEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data
}) => {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const pathId = `p2p-fiber-${id}`;

  return (
    <>
      {/* 1. Underlying ambient glow path */}
      <path
        d={edgePath}
        fill="none"
        stroke="rgba(234, 179, 8, 0.15)"
        strokeWidth={3}
        style={style}
      />

      {/* 2. Fiber Optic Pulse Path (Active dashed data stream) */}
      <path
        id={pathId}
        d={edgePath}
        fill="none"
        stroke="#eab308"
        strokeWidth={1.8}
        opacity={0.65}
        className="fiber-optic-path"
        style={style}
      />

      {/* 3. Floating Data Pill Payload (Riding along the fiber conduit) */}
      <g>
        <animateMotion
          dur="1.8s"
          repeatCount="1"
          fill="freeze"
        >
          <mpath href={`#${pathId}`} />
        </animateMotion>

        <foreignObject
          width="150"
          height="32"
          x="-75"
          y="-16"
          style={{ overflow: 'visible', pointerEvents: 'none' }}
        >
          <div className="w-[150px] h-[32px] flex items-center justify-center pointer-events-none">
            <div className="px-2.5 py-1 rounded-full border border-amber-400/80 bg-slate-950/95 text-amber-300 text-[10px] font-mono shadow-[0_0_18px_rgba(234,179,8,0.55)] flex items-center space-x-1.5 backdrop-blur-xl ring-1 ring-amber-500/40 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_6px_#eab308]" />
              <span className="font-bold text-amber-200 whitespace-nowrap">
                ⚡ {data?.amount || 0} kW
              </span>
              {data?.price && (
                <span className="text-amber-400/90 font-normal whitespace-nowrap">
                  (@${data.price})
                </span>
              )}
            </div>
          </div>
        </foreignObject>
      </g>
    </>
  );
};

export default memo(P2PFinancialEdge);
