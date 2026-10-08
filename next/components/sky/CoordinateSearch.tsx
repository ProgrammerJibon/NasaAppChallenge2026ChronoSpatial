"use client";

import React, { useState } from "react";
import { parseCoordinates } from "@/lib/coordinates";
import { RiSearchLine, RiCompassDiscoverLine } from "react-icons/ri";

export interface CoordinateSearchProps {
  onSearch: (ra: number, dec: number, targetName?: string) => void;
  loading?: boolean;
}

export function CoordinateSearch({ onSearch, loading = false }: CoordinateSearchProps) {
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = parseCoordinates(query);
    if (!parsed.isValid) {
      setError(parsed.error || "Invalid coordinates.");
      return;
    }
    onSearch(parsed.ra, parsed.dec, query.trim());
  };

  const handleQuickSelect = (name: string, ra: number, dec: number) => {
    setQuery(name);
    setError(null);
    onSearch(ra, dec, name);
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <RiSearchLine className="absolute left-3.5 text-slate-400 w-4 h-4 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Search target or coordinates (e.g. M31, Orion, 10.098, 39.143)..."
          className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 transition"
        />
        <button
          type="submit"
          disabled={loading || !query.trim()}
          className="absolute right-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-medium transition cursor-pointer"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && <p className="mt-1.5 text-xs text-rose-400 pl-1">{error}</p>}

      {/* Quick Suggestions */}
      <div className="flex flex-wrap items-center gap-1.5 mt-2 text-xs text-slate-400">
        <span className="flex items-center gap-1 text-[11px] text-slate-400">
          <RiCompassDiscoverLine className="w-3 h-3" /> Quick targets:
        </span>
        <button
          type="button"
          onClick={() => handleQuickSelect("M31", 10.098, 39.143)}
          className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
        >
          Andromeda (M31)
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect("Orion", 82.821, -3.99)}
          className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
        >
          Orion (M42)
        </button>
        <button
          type="button"
          onClick={() => handleQuickSelect("Pleiades", 56.655, 24.84)}
          className="px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition cursor-pointer"
        >
          Pleiades (M45)
        </button>
      </div>
    </div>
  );
}
