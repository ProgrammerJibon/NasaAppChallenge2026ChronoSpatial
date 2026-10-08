"use client";

import React, { useState, useRef, useCallback } from "react";
import type { Observation } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { formatShortDate } from "@/lib/format";

export interface SwipeCompareProps {
  obsA: Observation;
  obsB: Observation;
  alignedSrcA?: string;
  alignedSrcB?: string;
}

export function SwipeCompare({ obsA, obsB, alignedSrcA, alignedSrcB }: SwipeCompareProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      handleMove(e.clientX);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onTouchMove={handleTouchMove}
      className="relative w-full aspect-square max-h-[620px] mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl select-none cursor-ew-resize"
    >
      {/* Background: Epoch B */}
      <div className="absolute inset-0">
        <SkyImage
          observationId={obsB.id}
          src={alignedSrcB}
          alt="Epoch B"
          className="w-full h-full"
        />
        <div className="absolute top-3 right-3 px-2 py-1 rounded-lg bg-black/75 border border-purple-500/40 text-[11px] font-mono text-purple-300">
          Epoch B: {formatShortDate(obsB.observation_date)}
        </div>
      </div>

      {/* Foreground: Epoch A clipped by slider */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <SkyImage
          observationId={obsA.id}
          src={alignedSrcA}
          alt="Epoch A"
          className="w-full h-full"
        />
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/75 border border-sky-500/40 text-[11px] font-mono text-sky-300">
          Epoch A: {formatShortDate(obsA.observation_date)}
        </div>
      </div>

      {/* Divider Line & Handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center shadow-xl text-xs text-white">
          ↔
        </div>
      </div>
    </div>
  );
}
