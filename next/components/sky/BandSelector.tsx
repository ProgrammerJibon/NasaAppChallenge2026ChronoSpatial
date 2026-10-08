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
        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
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
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
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
            <span className="text-[10px] text-slate-400 hidden sm:inline">
              ({b.range.split(" ")[0]}µm)
            </span>
          </button>
        );
      })}
    </div>
  );
}
