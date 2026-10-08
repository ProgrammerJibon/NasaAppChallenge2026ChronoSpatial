"use client";

import React from "react";
import type { Observation } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { formatDate } from "@/lib/format";

export interface SideBySideProps {
  obsA: Observation;
  obsB: Observation;
  alignedSrcA?: string;
  alignedSrcB?: string;
}

export function SideBySide({ obsA, obsB, alignedSrcA, alignedSrcB }: SideBySideProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Epoch A */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs px-2 text-slate-300">
          <span className="font-semibold text-sky-400">Epoch A (Earlier)</span>
          <span className="font-mono text-slate-400">{formatDate(obsA.observation_date)}</span>
        </div>
        <div className="relative aspect-square rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-xl">
          <SkyImage
            observationId={obsA.id}
            src={alignedSrcA}
            alt="Epoch A"
            className="w-full h-full"
          />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300">
            Band {obsA.band_number}
          </div>
        </div>
      </div>

      {/* Epoch B */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs px-2 text-slate-300">
          <span className="font-semibold text-purple-400">Epoch B (Later)</span>
          <span className="font-mono text-slate-400">{formatDate(obsB.observation_date)}</span>
        </div>
        <div className="relative aspect-square rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-xl">
          <SkyImage
            observationId={obsB.id}
            src={alignedSrcB}
            alt="Epoch B"
            className="w-full h-full"
          />
          <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-mono text-slate-300">
            Band {obsB.band_number}
          </div>
        </div>
      </div>
    </div>
  );
}
