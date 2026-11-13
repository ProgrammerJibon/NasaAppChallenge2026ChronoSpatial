"use client";

import React, { useState, useRef, useCallback } from "react";
import { motion, useInView } from "framer-motion";
import type { Observation } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { formatShortDate } from "@/lib/format";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";

export interface SwipeCompareProps {
  obsA: Observation;
  obsB: Observation;
  alignedSrcA?: string;
  alignedSrcB?: string;
  introReveal?: boolean;
}

export function SwipeCompare({ obsA, obsB, alignedSrcA, alignedSrcB, introReveal = false }: SwipeCompareProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [interacted, setInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = useInView(containerRef, { amount: .35, once: true });
  const reducedMotion = useReducedMotionSafe();
  const introActive = introReveal && !interacted && !reducedMotion;
  const visualPosition = introActive && !visible ? 8 : sliderPosition;
  const transition = introActive && visible
    ? { duration: 1.8, delay: .18, ease: [ .22, 1, .36, 1 ] as const }
    : { duration: 0 };

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setInteracted(true);
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
      role="slider"
      tabIndex={0}
      aria-label="Epoch comparison divider"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={visualPosition}
      onKeyDown={e => { if(e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setInteracted(true); setSliderPosition(p => Math.max(0,Math.min(100,p + (e.key === "ArrowRight" ? 5 : -5)))); } }}
      style={{touchAction:"pan-y"}}
      onMouseDown={e => handleMove(e.clientX)}
      onTouchStart={e => handleMove(e.touches[0].clientX)}
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
          Second: {formatShortDate(obsB.observation_date)}
        </div>
      </div>

      {/* Foreground: Epoch A clipped by slider */}
      <motion.div
        className="absolute inset-0 overflow-hidden"
        initial={false}
        animate={{ clipPath: `inset(0 ${100 - visualPosition}% 0 0)` }}
        transition={transition}
      >
        <SkyImage
          observationId={obsA.id}
          src={alignedSrcA}
          alt="Epoch A"
          className="w-full h-full"
        />
        <div className="absolute top-3 left-3 px-2 py-1 rounded-lg bg-black/75 border border-sky-500/40 text-[11px] font-mono text-sky-300">
          First: {formatShortDate(obsA.observation_date)}
        </div>
      </motion.div>

      {/* Divider Line & Handle */}
      <motion.div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] z-20 pointer-events-none"
        initial={false}
        animate={{ left: `${visualPosition}%` }}
        transition={transition}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center shadow-xl text-xs text-white">
          ↔
        </div>
      </motion.div>
    </div>
  );
}
