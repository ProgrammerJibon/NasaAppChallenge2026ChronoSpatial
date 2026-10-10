"use client";

import React from "react";
import { SPHEREX_DETECTORS } from "@/lib/constants";
import { useLanguage } from "@/lib/i18n";

export interface BandSelectorProps {
  selectedBand: number | null;
  onSelectBand: (band: number | null) => void;
}

export function BandSelector({
  selectedBand,
  onSelectBand,
}: BandSelectorProps) {
  const { t } = useLanguage();
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onSelectBand(null)}
        aria-pressed={selectedBand === null}
        className={`selection-chip ${
          selectedBand === null
            ? "bg-slate-200 text-slate-900 shadow-sm"
            : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
        }`}
      >
        {t("allBands")}
      </button>

      {SPHEREX_DETECTORS.map((b) => {
        const isSelected = selectedBand === b.id;
        return (
          <button
            key={b.id}
            type="button"
            onClick={() => onSelectBand(b.id)}
            aria-pressed={isSelected}
            className={`selection-chip flex items-center gap-1.5 ${
              isSelected
                ? "bg-sky-500/20 text-sky-400 border border-sky-500/50 shadow-sm shadow-sky-500/10"
                : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: b.color }}
            />
            <span>{b.name}</span>

          </button>
        );
      })}
    </div>
  );
}
