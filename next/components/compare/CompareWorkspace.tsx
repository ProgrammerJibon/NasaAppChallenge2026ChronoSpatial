"use client";

import React, { useState } from "react";
import type { Comparison, Observation, ChangeCandidate } from "@/lib/types";
import { SideBySide } from "./SideBySide";
import { SwipeCompare } from "./SwipeCompare";
import { BlinkCompare } from "./BlinkCompare";
import { DifferenceView } from "./DifferenceView";
import { ChangeSummary } from "./ChangeSummary";
import { COMPARISON_MODES, type ComparisonMode } from "@/lib/constants";
import { api } from "@/lib/api";
import {
  RiSplitCellsHorizontal,
  RiDragMoveLine,
  RiEye2Line,
  RiContrast2Line,
  RiSubtractLine,
  RiRadarLine,
} from "react-icons/ri";

export interface CompareWorkspaceProps {
  comparison: Comparison;
  obsA: Observation;
  obsB: Observation;
}

const modeIcons: Record<ComparisonMode, React.ReactNode> = {
  "side-by-side": <RiSplitCellsHorizontal />,
  swipe: <RiDragMoveLine />,
  blink: <RiEye2Line />,
  fade: <RiContrast2Line />,
  difference: <RiSubtractLine />,
  significance: <RiRadarLine />,
};

export function CompareWorkspace({
  comparison,
  obsA,
  obsB,
}: CompareWorkspaceProps) {
  const [mode, setMode] = useState<ComparisonMode>("side-by-side");
  const [selectedCandidate, setSelectedCandidate] = useState<ChangeCandidate | null>(null);

  const alignedA = comparison.aligned_a_path
    ? api.getComparisonFileUrl(comparison.id, "aligned-a")
    : undefined;
  const alignedB = comparison.aligned_b_path
    ? api.getComparisonFileUrl(comparison.id, "aligned-b")
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      {/* Mode Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-1.5">
          {COMPARISON_MODES.map((m) => {
            const isActive = mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md shadow-sky-500/20"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span>{modeIcons[m.id]}</span>
                <span>{m.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-[11px] font-mono text-slate-400 px-2">
          {comparison.summary_json?.target_name || "SPHEREx Comparison"}
        </div>
      </div>

      {/* Main Workspace Stage */}
      <div className="p-4 rounded-3xl bg-slate-950/40 border border-slate-800/80">
        {mode === "side-by-side" && (
          <SideBySide
            obsA={obsA}
            obsB={obsB}
            alignedSrcA={alignedA}
            alignedSrcB={alignedB}
          />
        )}

        {mode === "swipe" && (
          <SwipeCompare
            obsA={obsA}
            obsB={obsB}
            alignedSrcA={alignedA}
            alignedSrcB={alignedB}
          />
        )}

        {mode === "blink" && (
          <BlinkCompare
            obsA={obsA}
            obsB={obsB}
            alignedSrcA={alignedA}
            alignedSrcB={alignedB}
          />
        )}

        {mode === "fade" && (
          <div className="flex flex-col items-center">
            <BlinkCompare
              obsA={obsA}
              obsB={obsB}
              alignedSrcA={alignedA}
              alignedSrcB={alignedB}
            />
          </div>
        )}

        {(mode === "difference" || mode === "significance") && (
          <DifferenceView
            comparisonId={comparison.id}
            hasSignificance={Boolean(comparison.significance_path)}
          />
        )}
      </div>

      {/* Summary and Candidates breakdown */}
      <ChangeSummary
        comparison={comparison}
        onSelectCandidate={(c) => setSelectedCandidate(c)}
      />
    </div>
  );
}
