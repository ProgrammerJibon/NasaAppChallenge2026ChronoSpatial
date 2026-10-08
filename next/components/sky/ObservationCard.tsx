"use client";

import React from "react";
import type { Observation } from "@/lib/types";
import { formatShortDate, formatCoords, formatWavelength } from "@/lib/format";
import { SkyImage } from "./SkyImage";

export interface ObservationCardProps {
  observation: Observation;
  selected?: boolean;
  onSelect?: (obs: Observation) => void;
  compact?: boolean;
}

export function ObservationCard({
  observation,
  selected = false,
  onSelect,
  compact = false,
}: ObservationCardProps) {
  return (
    <div
      onClick={() => onSelect?.(observation)}
      className={`relative overflow-hidden rounded-xl border transition-all duration-200 cursor-pointer ${
        selected
          ? "bg-sky-950/40 border-sky-500 shadow-md shadow-sky-950/40 ring-1 ring-sky-500"
          : "bg-slate-900/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900"
      } ${compact ? "p-2.5 flex items-center gap-3" : "p-3 flex flex-col gap-2.5"}`}
    >
      {/* Thumbnail */}
      <div className={`overflow-hidden rounded-lg bg-black border border-slate-800/60 flex-shrink-0 ${compact ? "w-14 h-14" : "w-full h-32"}`}>
        <SkyImage
          observationId={observation.id}
          alt={`Observation ${observation.archive_id}`}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="text-xs font-semibold text-slate-100 truncate">
            {formatShortDate(observation.observation_date)}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-950/60 border border-indigo-800/50 text-indigo-300">
            Band {observation.band_number}
          </span>
        </div>

        <div className="text-[11px] text-slate-400 font-mono truncate">
          {formatWavelength(observation.wavelength_min_um, observation.wavelength_max_um)}
        </div>

        {!compact && (
          <div className="text-[10px] text-slate-400 mt-1 truncate">
            {formatCoords(observation.ra, observation.dec)}
          </div>
        )}
      </div>
    </div>
  );
}
