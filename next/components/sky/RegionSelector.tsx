"use client";

import React from "react";
import type { SkyRegion } from "@/lib/types";

export interface RegionSelectorProps {
  regions: SkyRegion[];
  selectedSlug?: string;
  onSelect: (region: SkyRegion) => void;
}

export function RegionSelector({
  regions,
  selectedSlug,
  onSelect,
}: RegionSelectorProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {regions.map((region) => {
        const isSelected = region.slug === selectedSlug || region.id === selectedSlug;
        return (
          <button
            key={region.id}
            type="button"
            onClick={() => onSelect(region)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isSelected
                ? "bg-sky-500 text-white shadow-md shadow-sky-500/25 ring-2 ring-sky-400/40"
                : "bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800/80"
            }`}
          >
            {region.name}
          </button>
        );
      })}
    </div>
  );
}
