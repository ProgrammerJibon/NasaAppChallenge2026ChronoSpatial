"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { SkyImage } from "@/components/sky/SkyImage";
import { RiContrastLine } from "react-icons/ri";

export interface DifferenceViewProps {
  comparisonId: string;
  hasSignificance?: boolean;
}

export function DifferenceView({
  comparisonId,
  hasSignificance = true,
}: DifferenceViewProps) {
  const [viewMode, setViewMode] = useState<"difference" | "significance">("difference");

  const imageUrl = api.getComparisonFileUrl(comparisonId, viewMode);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode("difference")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
              viewMode === "difference"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            Flux Difference (ΔMJy/sr)
          </button>
          {hasSignificance && (
            <button
              type="button"
              onClick={() => setViewMode("significance")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                viewMode === "significance"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Significance Map (σ)
            </button>
          )}
        </div>

        <div className="text-[11px] font-mono text-slate-400">
          Astropy Astrometric WCS Delta
        </div>
      </div>

      {/* Difference Image Canvas */}
      <div className="relative w-full aspect-square max-h-[620px] mx-auto rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
        <SkyImage
          src={imageUrl}
          alt={`SPHEREx ${viewMode}`}
          className="w-full h-full"
        />

        {/* Scientific Label */}
        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-200">
          <RiContrastLine className="text-rose-400 w-4 h-4" />
          <span className="font-semibold text-white">
            {viewMode === "difference" ? "Scientific Flux Difference" : "Statistical Significance (σ)"}
          </span>
        </div>
      </div>

      {/* Scientific Signed Color Scale Legend */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <span>Negative Deficit (Faded)</span>
          <span>Zero Delta (Unchanged)</span>
          <span>Positive Excess (Brightened)</span>
        </div>
        <div className="h-3 rounded-full bg-gradient-to-r from-blue-600 via-slate-950 to-red-600 border border-slate-700/80" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Generated via pixel-by-pixel Astropy celestial WCS reprojection and additive background subtraction.
          Red regions indicate sources with higher flux in Epoch B (new transients, flared protostars).
          Blue regions indicate faded sources or fast motion departure.
        </p>
      </div>
    </div>
  );
}
