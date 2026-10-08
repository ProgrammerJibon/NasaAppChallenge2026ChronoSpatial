"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import type { Observation } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { EpochRail } from "./EpochRail";
import { PlaybackControls } from "./PlaybackControls";
import { formatDate, formatWavelength } from "@/lib/format";
import { RiContrast2Line, RiTimeLine } from "react-icons/ri";

export interface TimelinePlayerProps {
  observations: Observation[];
}

export function TimelinePlayer({ observations }: TimelinePlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loop, setLoop] = useState(true);
  const [crossfade, setCrossfade] = useState(true);
  const [compareIndices, setCompareIndices] = useState<[number, number] | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentObs = observations[currentIndex] || observations[0];

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= observations.length - 1) {
        return loop ? 0 : prev;
      }
      return prev + 1;
    });
  }, [observations.length, loop]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return loop ? observations.length - 1 : 0;
      }
      return prev - 1;
    });
  }, [observations.length, loop]);

  const handleCycleSpeed = () => {
    const speeds = [0.5, 1, 2, 4];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
  };

  const handleToggleCompareIndex = (idx: number) => {
    if (!compareIndices) {
      setCompareIndices([currentIndex, idx]);
    } else if (compareIndices[0] === idx) {
      setCompareIndices(null);
    } else if (compareIndices[1] === idx) {
      setCompareIndices(null);
    } else {
      setCompareIndices([compareIndices[0], idx]);
    }
  };

  // Autoplay loop
  useEffect(() => {
    if (isPlaying && observations.length > 1) {
      const intervalMs = Math.max(250, 1500 / speed);
      timerRef.current = setInterval(handleNext, intervalMs);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, speed, handleNext, observations.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  if (observations.length === 0) {
    return (
      <div className="p-8 text-center text-slate-400 bg-slate-900/50 rounded-2xl border border-slate-800">
        No observations found for timeline sequence.
      </div>
    );
  }

  const compareUrl =
    compareIndices && observations[compareIndices[0]] && observations[compareIndices[1]]
      ? `/compare?a=${observations[compareIndices[0]].id}&b=${observations[compareIndices[1]].id}`
      : observations.length >= 2
      ? `/compare?a=${observations[0].id}&b=${observations[observations.length - 1].id}`
      : "/compare";

  return (
    <div className="flex flex-col gap-6">
      {/* Central Spatially Stable Image Stage */}
      <div className="relative w-full aspect-video max-h-[580px] rounded-2xl bg-black border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
        {currentObs && (
          <div
            className={`w-full h-full flex items-center justify-center ${
              crossfade ? "transition-opacity duration-300" : ""
            }`}
          >
            <SkyImage
              observationId={currentObs.id}
              alt={`Epoch ${currentIndex + 1} - ${currentObs.archive_id}`}
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Temporal HUD overlay */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-200 shadow-lg">
            <RiTimeLine className="text-sky-400 w-4 h-4" />
            <span className="font-semibold text-white">Epoch #{currentIndex + 1} of {observations.length}</span>
            <span className="text-slate-400">·</span>
            <span>{formatDate(currentObs?.observation_date)}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-slate-800 text-xs font-mono text-indigo-300 shadow-lg">
            <span>Band {currentObs?.band_number}</span>
            <span className="text-slate-400">({formatWavelength(currentObs?.wavelength_min_um || 0, currentObs?.wavelength_max_um || 0)})</span>
          </div>
        </div>

        {/* Quick Compare CTA when 2 epochs selected */}
        <div className="absolute bottom-4 left-4 z-20">
          <Link
            href={compareUrl}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white font-medium text-xs backdrop-blur-md shadow-lg shadow-purple-950/40 transition"
          >
            <RiContrast2Line className="w-4 h-4" />
            <span>
              {compareIndices
                ? `Compare Epoch #${compareIndices[0] + 1} & #${compareIndices[1] + 1}`
                : "Compare First & Latest Epoch"}
            </span>
          </Link>
        </div>
      </div>

      {/* Epoch Rail */}
      <EpochRail
        observations={observations}
        currentIndex={currentIndex}
        onSelectIndex={setCurrentIndex}
        selectedIndicesForCompare={compareIndices}
        onToggleCompareIndex={handleToggleCompareIndex}
      />

      {/* Playback Controls */}
      <PlaybackControls
        isPlaying={isPlaying}
        onTogglePlay={() => setIsPlaying(!isPlaying)}
        onNext={handleNext}
        onPrev={handlePrev}
        speed={speed}
        onCycleSpeed={handleCycleSpeed}
        loop={loop}
        onToggleLoop={() => setLoop(!loop)}
        crossfade={crossfade}
        onToggleCrossfade={() => setCrossfade(!crossfade)}
      />
    </div>
  );
}
