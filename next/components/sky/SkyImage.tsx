"use client";

import React, { useState } from "react";
import { api } from "@/lib/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { RiImageLine } from "react-icons/ri";

export interface SkyImageProps {
  observationId?: string;
  src?: string;
  alt: string;
  className?: string;
  crosshair?: boolean;
  crosshairPos?: { x: number; y: number } | null;
}

export function SkyImage({
  observationId,
  src,
  alt,
  className = "",
  crosshair = false,
  crosshairPos,
}: SkyImageProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const imageUrl = src || (observationId ? api.getPreviewUrl(observationId) : "");

  return (
    <div className={`relative overflow-hidden bg-black flex items-center justify-center select-none ${className}`}>
      {loading && (
        <Skeleton className="absolute inset-0 w-full h-full z-10" />
      )}

      {error || !imageUrl ? (
        <div className="flex flex-col items-center justify-center p-6 text-slate-400 text-xs text-center z-20">
          <RiImageLine className="w-8 h-8 mb-2 opacity-50 text-slate-500" />
          <span>Image preview unavailable</span>
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={imageUrl}
          alt={alt}
          onLoad={() => setLoading(false)}
          onError={() => {
            setLoading(false);
            setError(true);
          }}
          className={`w-full h-full object-contain transition-opacity duration-300 ${
            loading ? "opacity-0" : "opacity-100"
          }`}
          draggable={false}
        />
      )}

      {/* Crosshair indicator */}
      {crosshair && crosshairPos && (
        <div
          className="absolute pointer-events-none z-30"
          style={{
            left: `${crosshairPos.x}%`,
            top: `${crosshairPos.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div className="relative w-8 h-8">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-400 shadow-[0_0_4px_rgba(34,211,238,0.8)]" />
            <div className="absolute inset-2 border border-cyan-400/80 rounded-full" />
          </div>
        </div>
      )}
    </div>
  );
}
