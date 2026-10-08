"use client";

import React from "react";
import type { Observation } from "@/lib/types";
import { ObservationCard } from "./ObservationCard";

export interface ObservationStripProps {
  observations: Observation[];
  selectedId?: string;
  onSelect: (obs: Observation) => void;
  orientation?: "horizontal" | "vertical";
}

export function ObservationStrip({
  observations,
  selectedId,
  onSelect,
  orientation = "horizontal",
}: ObservationStripProps) {
  if (observations.length === 0) {
    return (
      <div className="p-4 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
        No observations available for this filter.
      </div>
    );
  }

  if (orientation === "vertical") {
    return (
      <div className="flex flex-col gap-2 overflow-y-auto max-h-[550px] pr-1">
        {observations.map((obs) => (
          <ObservationCard
            key={obs.id}
            observation={obs}
            selected={obs.id === selectedId}
            onSelect={onSelect}
            compact
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-800">
      {observations.map((obs) => (
        <div key={obs.id} className="w-44 flex-shrink-0">
          <ObservationCard
            observation={obs}
            selected={obs.id === selectedId}
            onSelect={onSelect}
          />
        </div>
      ))}
    </div>
  );
}
