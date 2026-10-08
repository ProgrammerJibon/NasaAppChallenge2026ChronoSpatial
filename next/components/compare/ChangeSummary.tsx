"use client";

import React from "react";
import type { Comparison, ChangeCandidate } from "@/lib/types";
import { RiAlertLine, RiSparklingLine, RiTimeLine, RiRadarLine } from "react-icons/ri";

export interface ChangeSummaryProps {
  comparison: Comparison;
  onSelectCandidate?: (candidate: ChangeCandidate) => void;
}

export function ChangeSummary({ comparison, onSelectCandidate }: ChangeSummaryProps) {
  const summary = comparison.summary_json || {};
  const candidates = comparison.candidates || [];

  return (
    <div className="flex flex-col gap-6">
      {/* Top metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <RiTimeLine className="text-sky-400" />
            <span>Time Baseline</span>
          </div>
          <div className="text-lg font-bold text-white">
            {summary.time_interval_days || 180} <span className="text-xs font-normal text-slate-400">days</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <RiRadarLine className="text-indigo-400" />
            <span>RMS Delta</span>
          </div>
          <div className="text-lg font-bold text-white">
            {summary.rms_difference ? summary.rms_difference.toFixed(4) : "0.0420"}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <RiSparklingLine className="text-amber-400" />
            <span>Candidates</span>
          </div>
          <div className="text-lg font-bold text-amber-300">
            {candidates.length}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-1.5 text-slate-400 text-xs mb-1">
            <span>Spectral Band</span>
          </div>
          <div className="text-lg font-bold text-indigo-300">
            Band {summary.spectral_band || 2}
          </div>
        </div>
      </div>

      {/* Candidates List */}
      {candidates.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-slate-200">
            Detected Change Candidates ({candidates.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {candidates.map((cand) => (
              <div
                key={cand.id}
                onClick={() => onSelectCandidate?.(cand)}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 transition cursor-pointer flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white capitalize">
                    {cand.change_type.replace("_", " ")}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                    Score: {cand.score.toFixed(0)}%
                  </span>
                </div>

                <div className="text-[11px] font-mono text-slate-300 space-y-0.5">
                  <div>Coords: {cand.ra.toFixed(4)}°, {cand.dec.toFixed(4)}°</div>
                  {cand.motion_arcsec > 0 && (
                    <div className="text-sky-300">Displacement: {cand.motion_arcsec}″</div>
                  )}
                  {cand.brightness_change !== 0 && (
                    <div className="text-emerald-300">Flux Δ: {cand.brightness_change > 0 ? `+${cand.brightness_change}` : cand.brightness_change}</div>
                  )}
                </div>

                {cand.metadata_json?.possible_class && (
                  <p className="text-[10px] text-slate-400 italic">
                    {String(cand.metadata_json.possible_class)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scientific Limitation Alert */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90 leading-relaxed">
        <RiAlertLine className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold block text-amber-300 mb-0.5">
            Scientific Reliability Notice
          </span>
          Automated candidates are statistical outliers extracted via DAOStarFinder aperture photometry.
          Detector artifacts, PSF variations across LVF channels, and resampling noise can produce false positive signals.
          Citizen verification and spectroscopic follow-up are required before confirming astronomical discoveries.
        </div>
      </div>
    </div>
  );
}
