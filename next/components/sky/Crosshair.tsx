import React from "react";

export interface CrosshairProps {
  x: number;
  y: number;
  ra?: number;
  dec?: number;
}

export function Crosshair({ x, y, ra, dec }: CrosshairProps) {
  return (
    <div
      className="absolute pointer-events-none z-30 transition-transform duration-75"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className="relative w-10 h-10">
        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.9)]" />
        <div className="absolute inset-2 border border-cyan-400/80 rounded-full" />
      </div>
      {ra !== undefined && dec !== undefined && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-1.5 py-0.5 rounded bg-black/80 border border-cyan-500/40 text-[10px] font-mono text-cyan-300 whitespace-nowrap shadow-md">
          {ra.toFixed(4)}°, {dec >= 0 ? `+${dec.toFixed(4)}` : dec.toFixed(4)}°
        </div>
      )}
    </div>
  );
}
