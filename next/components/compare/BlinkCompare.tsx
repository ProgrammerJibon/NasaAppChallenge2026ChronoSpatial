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
  const [isBlinking, setIsBlinking] = useState(false);
  const [intervalMs, setIntervalMs] = useState(500);

  useEffect(() => {
    if (!isBlinking) return;
    const timer = setInterval(() => {
      setActiveEpoch((prev) => (prev === "A" ? "B" : "A"));
    }, intervalMs);
    return () => clearInterval(timer);
  }, [isBlinking, intervalMs]);

  const currentObs = activeEpoch === "A" ? obsA : obsB;

  return (
    <div className="flex flex-col gap-4">
      <div className="blink-controls" role="group" aria-label="Blink comparison playback">
        <button type="button" onClick={() => setIsBlinking(!isBlinking)} aria-label={isBlinking ? "Pause blink comparison" : "Play blink comparison"}>
          {isBlinking ? <RiPauseFill /> : <RiPlayFill />}
          <span>{isBlinking ? "Pause" : "Play"}</span>
        </button>
        <span className="blink-controls-caption">Alternate dates</span>
        <div className="blink-speed" role="group" aria-label="Blink interval">
          {[250, 500, 1000].map((ms) => (
            <button key={ms} type="button" aria-pressed={intervalMs === ms} onClick={() => setIntervalMs(ms)}>{ms} ms</button>
          ))}
        </div>
      </div>
      <div className="relative w-full aspect-square max-h-[620px] mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
        {(["A", "B"] as const).map(epoch => (
          <div key={epoch} className="absolute inset-0" aria-hidden={activeEpoch !== epoch}
            style={{ visibility: activeEpoch === epoch ? "visible" : "hidden" }}>
            <SkyImage observationId={epoch === "A" ? obsA.id : obsB.id}
              src={epoch === "A" ? alignedSrcA : alignedSrcB}
              alt={`Blink Epoch ${epoch}`} className="w-full h-full" />
          </div>
        ))}

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

    </div>
  );
}
