"use client";

import React from "react";
import {
  RiPlayFill,
  RiPauseFill,
  RiSkipBackLine,
  RiSkipForwardLine,
  RiRepeatLine,
  RiSpeedUpLine,
} from "react-icons/ri";

export interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  speed: number;
  onCycleSpeed: () => void;
  loop: boolean;
  onToggleLoop: () => void;
  crossfade: boolean;
  onToggleCrossfade: () => void;
}

export function PlaybackControls({
  isPlaying,
  onTogglePlay,
  onNext,
  onPrev,
  speed,
  onCycleSpeed,
  loop,
  onToggleLoop,
  crossfade,
  onToggleCrossfade,
}: PlaybackControlsProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-md">
      {/* Playback Buttons */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Previous Epoch (Left Arrow)"
          aria-label="Previous epoch"
        >
          <RiSkipBackLine className="w-5 h-5" />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className="p-3 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 active:scale-95 transition cursor-pointer"
          title={isPlaying ? "Pause (Space)" : "Play Animation (Space)"}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <RiPauseFill className="w-6 h-6" /> : <RiPlayFill className="w-6 h-6" />}
        </button>

        <button
          type="button"
          onClick={onNext}
          className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          title="Next Epoch (Right Arrow)"
          aria-label="Next epoch"
        >
          <RiSkipForwardLine className="w-5 h-5" />
        </button>
      </div>

      {/* Speed & Mode Options */}
      <div className="flex items-center gap-2">
        {/* Speed button */}
        <button
          type="button"
          onClick={onCycleSpeed}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition cursor-pointer"
          title="Playback speed"
        >
          <RiSpeedUpLine className="w-3.5 h-3.5 text-sky-400" />
          <span>{speed}x</span>
        </button>

        {/* Loop toggle */}
        <button
          type="button"
          onClick={onToggleLoop}
          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            loop
              ? "bg-sky-500/20 text-sky-300 border border-sky-500/40"
              : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
          }`}
          title="Toggle Repeat / Loop"
        >
          <RiRepeatLine className="w-3.5 h-3.5" />
          <span>Loop</span>
        </button>

        {/* Crossfade toggle */}
        <button
          type="button"
          onClick={onToggleCrossfade}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer ${
            crossfade
              ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
              : "bg-slate-800/80 text-slate-400 hover:text-slate-200"
          }`}
          title="Smooth crossfade transition between epochs"
        >
          Crossfade
        </button>
      </div>
    </div>
  );
}
