"use client";

import React, { useState, useEffect } from "react";
import type { Observation } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { formatShortDate } from "@/lib/format";
import { RiPlayFill, RiPauseFill } from "react-icons/ri";

export interface BlinkCompareProps {
  obsA: Observation;
  obsB: Observation;
  alignedSrcA?: string;
  alignedSrcB?: string;
}

export function BlinkCompare({ obsA, obsB, alignedSrcA, alignedSrcB }: BlinkCompareProps) {
  const [activeEpoch, setActiveEpoch] = useState<"A" | "B">("A");
  const [isBlinking, setIsBlinking] = useState(true);
  const [intervalMs, setIntervalMs] = useState(500);

  useEffect(() => {
    if (!isBlinking) return;
    const timer = setInterval(() => {
      setActiveEpoch((prev) => (prev === "A" ? "B" : "A"));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isBlinking, intervalMs]);

  const currentObs = activeEpoch === "A" ? obsA : obsB;
  const currentSrc = activeEpoch === "A" ? alignedSrcA : alignedSrcB;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative w-full aspect-square max-h-[620px] mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
        <SkyImage
          observationId={currentObs.id}
          src={currentSrc}
          alt={`Blink Epoch ${activeEpoch}`}
          className="w-full h-full"
        />

        {/* Active Epoch Pill */}
        <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-slate-800 text-xs font-mono">
          <span
            className={`w-2 h-2 rounded-full ${
              activeEpoch === "A" ? "bg-sky-400" : "bg-purple-400"
            }`}
          />
          <span className="font-bold text-white">Epoch {activeEpoch}</span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-200">{formatShortDate(currentObs.observation_date)}</span>
        </div>
      </div>

      {/* Blink Controls */}
      <div className="flex items-center justify-center gap-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
        <button
          type="button"
          onClick={() => setIsBlinking(!isBlinking)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition cursor-pointer"
        >
          {isBlinking ? <RiPauseFill /> : <RiPlayFill />}
          <span>{isBlinking ? "Pause Blink" : "Resume Blink"}</span>
        </button>

        <div className="flex items-center gap-1">
          {[250, 500, 1000].map((ms) => (
            <button
              key={ms}
              type="button"
              onClick={() => setIntervalMs(ms)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono transition cursor-pointer ${
                intervalMs === ms
                  ? "bg-slate-700 text-white border border-slate-600"
                  : "bg-slate-800/60 text-slate-400 hover:text-white"
              }`}
            >
              {ms}ms
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
