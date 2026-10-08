"use client";

import React, { useState } from "react";
import type { ReviewItem } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { BlinkCompare } from "@/components/compare/BlinkCompare";
import { api } from "@/lib/api";
import { formatCoords } from "@/lib/format";

export interface ReviewCardProps {
  item: ReviewItem;
}

export function ReviewCard({ item }: ReviewCardProps) {
  const [view, setView] = useState<"blink" | "difference">("blink");
  const { candidate, comparison } = item;

  const obsA = comparison?.observationA;
  const obsB = comparison?.observationB;

  return (
    <div className="flex flex-col gap-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setView("blink")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
              view === "blink"
                ? "bg-sky-600 text-white shadow-md shadow-sky-600/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Epoch Blink
          </button>
          <button
            type="button"
            onClick={() => setView("difference")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
              view === "difference"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/20"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Difference Flux Map
          </button>
        </div>

        {candidate && (
          <div className="text-xs font-mono text-slate-400">
            {formatCoords(candidate.ra, candidate.dec)}
          </div>
        )}
      </div>

      {/* Visual Canvas */}
      <div className="relative aspect-square max-h-[520px] rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
        {view === "blink" && obsA && obsB ? (
          <BlinkCompare
            obsA={obsA}
            obsB={obsB}
            alignedSrcA={comparison?.aligned_a_path ? api.getComparisonFileUrl(comparison.id, "aligned-a") : undefined}
            alignedSrcB={comparison?.aligned_b_path ? api.getComparisonFileUrl(comparison.id, "aligned-b") : undefined}
          />
        ) : (
          <SkyImage
            src={api.getComparisonFileUrl(item.comparisonId, "difference")}
            alt="Difference Map"
            className="w-full h-full"
          />
        )}
      </div>

      {/* Candidate Data Readout */}
      {candidate && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px]">CANDIDATE TYPE</span>
            <span className="font-semibold text-white capitalize">{candidate.change_type.replace("_", " ")}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">DETECTION SCORE</span>
            <span className="font-mono text-amber-300 font-bold">{candidate.score.toFixed(0)}%</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">DISPLACEMENT</span>
            <span className="font-mono text-sky-300">{candidate.motion_arcsec ? `${candidate.motion_arcsec}″` : "None"}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">BRIGHTNESS DELTA</span>
            <span className="font-mono text-emerald-300">{candidate.brightness_change > 0 ? `+${candidate.brightness_change}` : candidate.brightness_change}</span>
          </div>
        </div>
      )}
    </div>
  );
}
