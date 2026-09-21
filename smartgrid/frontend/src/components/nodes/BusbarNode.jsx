import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { Zap, Activity } from 'lucide-react';

/**
 * BusbarNode: Central electrical busbar representing a 400V 3-Phase local distribution bus.
 * Interactive Canvas Element: Movable (draggable), horizontally resizable via NodeResizer, with continuous 24-slot connection zones.
 */
const BusbarNode = ({ data, selected }) => {
  // 24 finely arrayed handle slots across width for nearest-point snapping
  const slotCount = 24;
  const slots = Array.from({ length: slotCount }, (_, i) => ((i + 0.5) / slotCount) * 100);
  const busWidth = data?.width || 1200;

  return (
    <div
      className={`relative select-none pointer-events-auto transition-shadow ${
        selected ? 'ring-2 ring-cyan-400/80 rounded-xl' : ''
      }`}
      style={{ minWidth: '500px', width: `${busWidth}px`, height: '36px' }}
    >
      {/* Horizontal Resizer Control (Visible when Busbar is clicked/selected) */}
      <NodeResizer
        minWidth={500}
        minHeight={36}
        maxHeight={36}
        isVisible={selected}
        lineClassName="!border-cyan-400/60"
        handleClassName="!w-3 !h-3 !bg-cyan-400 !border-slate-900 !rounded-full shadow-[0_0_10px_#06b6d4]"
      />

      {/* Top handles array (24 continuous connection slots for nearest-point snapping) */}
      {slots.map((pct, index) => (
        <React.Fragment key={`bus-top-${index}`}>
          <Handle
            id={`top-${index}`}
            type="target"
            position={Position.Top}
            style={{
              left: `${pct.toFixed(2)}%`,
              top: '12px',
              width: '6px',
              height: '6px',
              background: '#38bdf8',
              borderColor: '#0f172a',
              opacity: 0.6
            }}
          />
          <Handle
            id={`top-src-${index}`}
            type="source"
            position={Position.Top}
            style={{
              left: `${pct.toFixed(2)}%`,
              top: '12px',
              width: '6px',
              height: '6px',
              background: '#38bdf8',
              borderColor: '#0f172a',
              opacity: 0
            }}
          />
        </React.Fragment>
      ))}

      {/* Main Busbar Glow Container & Physical Bar */}
      <div className="relative w-full h-[14px] mt-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-[0_0_25px_rgba(6,182,212,0.7)] border border-cyan-300/60 overflow-hidden flex items-center justify-between px-3 cursor-grab active:cursor-grabbing">
        {/* Animated current pulse light running through the bus */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[pulse_2s_ease-in-out_infinite]" />
      </div>

      {/* Technical Transformer & Thermal Capacity Gauge SLD Badge */}
      <div className="absolute -top-10 left-2 flex items-center space-x-3 px-3 py-1.5 rounded-xl bg-slate-900/95 border border-cyan-500/40 text-[10px] font-mono shadow-xl backdrop-blur-md">
        <div className="flex items-center space-x-1.5 text-cyan-300 font-bold border-r border-slate-700/80 pr-2.5">
          <Zap className="w-3.5 h-3.5 text-cyan-400 fill-current animate-pulse" />
          <span>Central 100kVA Transformer</span>
        </div>

        {/* Live Thermal Gauge */}
        <div className="flex items-center space-x-2">
          <span className="text-slate-400">Thermal Load:</span>
          <div className="w-24 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                data?.isCongested || (data?.transformerLoadKW && data.transformerLoadKW > 90)
                  ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]'
                  : data?.transformerLoadKW > 60
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-emerald-400 to-cyan-400'
              }`}
              style={{ width: `${Math.min(100, Math.round(((data?.transformerLoadKW || 0) / (data?.thermalLimitKW || 100)) * 100))}%` }}
            />
          </div>
          <span className={`font-bold ${data?.isCongested ? 'text-rose-400 animate-pulse' : 'text-slate-200'}`}>
            {data?.transformerLoadKW || 0} / {data?.thermalLimitKW || 100} kW
          </span>
          {data?.isCongested && (
            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold text-[9px] animate-pulse">
              CONGESTION CURTAILING
            </span>
          )}
        </div>
      </div>

      {/* Substation Feeder Tap on the far right */}
      <div className="absolute -bottom-6 right-2 flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-indigo-500/40 text-[10px] font-mono text-indigo-300 shadow-md backdrop-blur-md">
        <Activity className="w-3 h-3 text-indigo-400" />
        <span>Substation Feeder Tap #1</span>
      </div>

      {/* Bottom handles array (24 continuous connection slots) */}
      {slots.map((pct, index) => (
        <React.Fragment key={`bus-bottom-${index}`}>
          <Handle
            id={`bottom-${index}`}
            type="target"
            position={Position.Bottom}
            style={{
              left: `${pct.toFixed(2)}%`,
              bottom: '10px',
              width: '6px',
              height: '6px',
              background: '#38bdf8',
              borderColor: '#0f172a',
              opacity: 0.6
            }}
          />
          <Handle
            id={`bottom-src-${index}`}
            type="source"
            position={Position.Bottom}
            style={{
              left: `${pct.toFixed(2)}%`,
              bottom: '10px',
              width: '6px',
              height: '6px',
              background: '#38bdf8',
              borderColor: '#0f172a',
              opacity: 0
            }}
          />
        </React.Fragment>
      ))}

      {/* Left side connection */}
      <Handle
        id="left"
        type="target"
        position={Position.Left}
        style={{
          top: '20px',
          left: '-4px',
          width: '8px',
          height: '8px',
          background: '#38bdf8',
          borderColor: '#0f172a'
        }}
      />
      <Handle
        id="left-src"
        type="source"
        position={Position.Left}
        style={{
          top: '20px',
          left: '-4px',
          width: '8px',
          height: '8px',
          background: '#38bdf8',
          borderColor: '#0f172a',
          opacity: 0
        }}
      />

      {/* Right side connection for Substation / Utility Grid */}
      <Handle
        id="right"
        type="target"
        position={Position.Right}
        style={{
          top: '20px',
          right: '-4px',
          width: '10px',
          height: '10px',
          background: '#818cf8',
          borderColor: '#0f172a'
        }}
      />
      <Handle
        id="right-src"
        type="source"
        position={Position.Right}
        style={{
          top: '20px',
          right: '-4px',
          width: '10px',
          height: '10px',
          background: '#818cf8',
          borderColor: '#0f172a',
          opacity: 0
        }}
      />
    </div>
  );
};

export default memo(BusbarNode);
