"use client";

import React from "react";
import type { Observation } from "@/lib/types";
import { formatShortDate } from "@/lib/format";
import { SkyImage } from "@/components/sky/SkyImage";

export interface EpochRailProps {
  observations: Observation[];
  currentIndex: number;
  onSelectIndex: (index: number) => void;
  selectedIndicesForCompare?: [number, number] | null;
  onToggleCompareIndex?: (index: number) => void;
}

export function EpochRail({
  observations,
  currentIndex,
  onSelectIndex,
  selectedIndicesForCompare,
  onToggleCompareIndex,
}: EpochRailProps) {
  return (
    <div className="relative py-4">
      {/* Horizontal connecting line */}
      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-800 -translate-y-1/2 z-0" />

      {/* Epoch Nodes */}
      <div className="relative z-10 flex items-center justify-between gap-4 overflow-x-auto px-4 py-2 scrollbar-thin">
        {observations.map((obs, idx) => {
          const isCurrent = idx === currentIndex;
          const isSelectedForCompare =
            selectedIndicesForCompare &&
            (selectedIndicesForCompare[0] === idx || selectedIndicesForCompare[1] === idx);

          return (
            <div
              key={obs.id}
              onClick={() => onSelectIndex(idx)}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer group"
            >
              {/* Thumbnail Pin */}
              <div
                className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                  isCurrent
                    ? "border-sky-400 ring-4 ring-sky-500/25 scale-110 shadow-lg shadow-sky-500/20"
                    : isSelectedForCompare
                    ? "border-purple-400 ring-2 ring-purple-500/30"
                    : "border-slate-700/80 hover:border-slate-500 hover:scale-105"
                }`}
              >
                <SkyImage
                  observationId={obs.id}
                  alt={`Epoch ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[9px] font-mono text-slate-300">
                  #{idx + 1}
                </span>
              </div>

              {/* Date & Metadata label */}
              <div className="text-center">
                <span
                  className={`block text-[11px] font-semibold whitespace-nowrap ${
                    isCurrent ? "text-sky-300" : "text-slate-400 group-hover:text-slate-200"
                  }`}
                >
                  {formatShortDate(obs.observation_date)}
                </span>
                <span className="block text-[9px] font-mono text-slate-400">
                  Band {obs.band_number}
                </span>
              </div>

              {/* Compare toggle pill */}
              {onToggleCompareIndex && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCompareIndex(idx);
                  }}
                  className={`mt-0.5 px-1.5 py-0.5 text-[9px] rounded font-mono transition ${
                    isSelectedForCompare
                      ? "bg-purple-600 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {isSelectedForCompare ? "Selected" : "+ Compare"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
