"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { SkyImage } from "./SkyImage";
import { Crosshair } from "./Crosshair";
import { useViewerStore } from "@/store/viewerStore";
import {
  RiZoomInLine,
  RiZoomOutLine,
  RiRestartLine,
  RiFocus3Line,
  RiFullscreenLine,
  RiFullscreenExitLine,
} from "react-icons/ri";

export interface SkyImageViewerProps {
  observationId?: string;
  src?: string;
  alt: string;
  ra?: number;
  dec?: number;
  candidates?: Array<{
    x: number;
    y: number;
    ra: number;
    dec: number;
    label?: string;
    change_type?: string;
  }>;
  className?: string;
}

export function SkyImageViewer({
  observationId,
  src,
  alt,
  ra = 0,
  dec = 0,
  candidates = [],
  className = "",
}: SkyImageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number; ra: number; dec: number } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const zoom = useViewerStore((s) => s.zoom);
  const panX = useViewerStore((s) => s.panX);
  const panY = useViewerStore((s) => s.panY);
  const setZoom = useViewerStore((s) => s.setZoom);
  const setPan = useViewerStore((s) => s.setPan);
  const resetView = useViewerStore((s) => s.resetView);
  const crosshairEnabled = useViewerStore((s) => s.crosshairEnabled);
  const setCrosshairEnabled = useViewerStore((s) => s.setCrosshairEnabled);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom((prev) => Math.min(8, Math.max(0.8, prev + delta)));
  };

  // Drag pan
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setPan(e.clientX - dragStart.x, e.clientY - dragStart.y);
      }

      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const normX = ((e.clientX - rect.left) / rect.width) * 100;
        const normY = ((e.clientY - rect.top) / rect.height) * 100;

        // Approximate RA/Dec offset from center based on 0.25 deg field
        const offsetRa = ((normX - 50) / 100) * 0.25;
        const offsetDec = ((50 - normY) / 100) * 0.25;

        setCursorPos({
          x: normX,
          y: normY,
          ra: Number((ra + offsetRa).toFixed(4)),
          dec: Number((dec + offsetDec).toFixed(4)),
        });
      }
    },
    [isDragging, dragStart, setPan, ra, dec]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setCursorPos(null);
      }}
      className={`relative overflow-hidden rounded-2xl bg-black border border-slate-800 shadow-2xl select-none group ${
        isDragging ? "cursor-grabbing" : "cursor-crosshair"
      } ${className}`}
      style={{ minHeight: "420px" }}
    >
      {/* Sky Image Layer with pan & zoom transform */}
      <div
        className="w-full h-full flex items-center justify-center transition-transform duration-75"
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: "center center",
        }}
      >
        <SkyImage observationId={observationId} src={src} alt={alt} className="w-full h-full max-h-[700px]" />

        {/* Candidate Overlays */}
        {candidates.map((cand, idx) => (
          <div
            key={idx}
            className="absolute z-20 pointer-events-auto group/cand cursor-pointer"
            style={{
              left: `${cand.x * 2.85}%`,
              top: `${cand.y * 2.85}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <div className="relative">
              <span className="w-4 h-4 rounded-full border-2 border-amber-400 bg-amber-400/20 block animate-ping" />
              <span className="w-3 h-3 rounded-full border-2 border-amber-400 bg-amber-500 absolute inset-0.5" />
            </div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 hidden group-hover/cand:block px-2 py-1 bg-slate-900 border border-amber-500/50 rounded text-[10px] font-mono text-amber-300 whitespace-nowrap z-30 shadow-lg">
              {cand.label || cand.change_type || "Candidate"} ({cand.ra.toFixed(3)}°, {cand.dec.toFixed(3)}°)
            </div>
          </div>
        ))}
      </div>

      {/* Floating Crosshair */}
      {crosshairEnabled && cursorPos && (
        <Crosshair
          x={cursorPos.x}
          y={cursorPos.y}
          ra={cursorPos.ra}
          dec={cursorPos.dec}
        />
      )}

      {/* Top Header Information Overlay */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-slate-300 shadow-md">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
          <span>Center: RA {ra.toFixed(4)}° / Dec {dec >= 0 ? `+${dec.toFixed(4)}` : dec.toFixed(4)}°</span>
        </div>

        {cursorPos && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-slate-800 text-[11px] font-mono text-cyan-300 shadow-md">
            <span>Cursor: {cursorPos.ra.toFixed(4)}°, {cursorPos.dec >= 0 ? `+${cursorPos.dec.toFixed(4)}` : cursorPos.dec.toFixed(4)}°</span>
          </div>
        )}
      </div>

      {/* Floating Control Toolbar */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-800 shadow-xl z-30">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => Math.min(8, z + 0.3));
          }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Zoom In (+)"
          aria-label="Zoom in"
        >
          <RiZoomInLine className="w-4 h-4" />
        </button>
        <span className="text-[11px] font-mono text-slate-400 px-1">{zoom.toFixed(1)}x</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoom((z) => Math.max(0.8, z - 0.3));
          }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Zoom Out (-)"
          aria-label="Zoom out"
        >
          <RiZoomOutLine className="w-4 h-4" />
        </button>
        <div className="w-[1px] h-4 bg-slate-800" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            resetView();
          }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Reset View"
          aria-label="Reset view"
        >
          <RiRestartLine className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setCrosshairEnabled(!crosshairEnabled);
          }}
          className={`p-1.5 rounded-lg transition ${
            crosshairEnabled ? "text-cyan-400 bg-cyan-950/40 border border-cyan-800/40" : "text-slate-400 hover:text-white hover:bg-slate-800"
          }`}
          title="Toggle Crosshair"
          aria-label="Toggle crosshair"
        >
          <RiFocus3Line className="w-4 h-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
          className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition"
          title="Toggle Fullscreen"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <RiFullscreenExitLine className="w-4 h-4" /> : <RiFullscreenLine className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
