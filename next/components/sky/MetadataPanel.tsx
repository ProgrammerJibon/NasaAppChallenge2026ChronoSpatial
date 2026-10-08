"use client";

import React, { useState } from "react";
import type { Observation } from "@/lib/types";
import { formatDate, formatCoords, formatWavelength } from "@/lib/format";
import { RiInformationLine, RiArrowDownSLine, RiArrowUpSLine, RiExternalLinkLine } from "react-icons/ri";

export interface MetadataPanelProps {
  observation: Observation | null;
}

export function MetadataPanel({ observation }: MetadataPanelProps) {
  const [expanded, setExpanded] = useState(false);

  if (!observation) return null;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/70 backdrop-blur-md overflow-hidden text-slate-300 text-xs">
      <div
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-800/40 transition select-none"
      >
        <div className="flex items-center gap-2 font-semibold text-slate-100">
          <RiInformationLine className="w-4 h-4 text-sky-400" />
          <span>FITS Archive Metadata</span>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="font-mono text-[11px]">{observation.archive_id}</span>
          {expanded ? <RiArrowUpSLine className="w-4 h-4" /> : <RiArrowDownSLine className="w-4 h-4" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 border-t border-slate-800 space-y-3 font-mono text-[11px]">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div>
              <span className="text-slate-400 block text-[10px]">OBSERVATION DATE</span>
              <span className="text-slate-200">{formatDate(observation.observation_date)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">DETECTOR BAND</span>
              <span className="text-indigo-300">Band {observation.band_number}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">WAVELENGTH COVERAGE</span>
              <span className="text-slate-200">
                {formatWavelength(observation.wavelength_min_um, observation.wavelength_max_um)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">SURFACE BRIGHTNESS UNIT</span>
              <span className="text-emerald-300">MJy/sr (MegaJanskys per steradian)</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">CELESTIAL COORDINATES</span>
              <span className="text-slate-200">{formatCoords(observation.ra, observation.dec)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px]">IMAGE DIMENSIONS</span>
              <span className="text-slate-200">{observation.width || 35} × {observation.height || 35} pixels</span>
            </div>
          </div>

          {observation.archive_url && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">IPAC Provenance</span>
              <a
                href={observation.archive_url}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
              >
                IRSA Product Link <RiExternalLinkLine className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
