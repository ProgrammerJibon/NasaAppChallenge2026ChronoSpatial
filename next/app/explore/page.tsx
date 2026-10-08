"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import type { Observation, SkyRegion } from "@/lib/types";
import { SkyImageViewer } from "@/components/sky/SkyImageViewer";
import { CoordinateSearch } from "@/components/sky/CoordinateSearch";
import { RegionSelector } from "@/components/sky/RegionSelector";
import { BandSelector } from "@/components/sky/BandSelector";
import { ObservationStrip } from "@/components/sky/ObservationStrip";
import { MetadataPanel } from "@/components/sky/MetadataPanel";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatDate, formatCoords, formatWavelength } from "@/lib/format";
import {
  RiTimeLine,
  RiContrast2Line,
  RiArrowLeftLine,
  RiArrowRightLine,
} from "react-icons/ri";

function ExploreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [regions, setRegions] = useState<SkyRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<SkyRegion | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedObs, setSelectedObs] = useState<Observation | null>(null);
  const [selectedBand, setSelectedBand] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);
        const [regList, bs] = await Promise.all([
          api.getRegions(),
          api.getBootstrap(),
        ]);
        setRegions(regList);

        // Check query param for region slug
        const regionSlug = searchParams.get("region");
        const obsId = searchParams.get("obs");

        let activeRegion = regList.find((r) => r.slug === regionSlug) || bs.featuredRegion || regList[0];
        setSelectedRegion(activeRegion);

        // Load observations for region
        const obsRes = await api.listObservations({
          regionId: activeRegion.id,
          limit: 50,
        });
        setObservations(obsRes.observations);

        const initialObs =
          (obsId && obsRes.observations.find((o) => o.id === obsId)) ||
          obsRes.observations[0] ||
          bs.demoObservations[0] ||
          null;
        setSelectedObs(initialObs);
      } catch (err: any) {
        setError(err instanceof ApiError ? err.message : "Failed to load sky explorer data.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [searchParams]);

  // Handle region selection
  const handleSelectRegion = async (region: SkyRegion) => {
    setSelectedRegion(region);
    setSelectedBand(null);
    setLoading(true);
    try {
      const res = await api.listObservations({ regionId: region.id, limit: 50 });
      setObservations(res.observations);
      setSelectedObs(res.observations[0] || null);
      router.push(`/explore?region=${region.slug}`);
    } catch (err: any) {
      setError(err.message || "Failed to load observations for region");
    } finally {
      setLoading(false);
    }
  };

  // Handle band filter
  const handleSelectBand = async (band: number | null) => {
    setSelectedBand(band);
    if (!selectedRegion) return;
    setLoading(true);
    try {
      const res = await api.listObservations({
        regionId: selectedRegion.id,
        band: band ?? undefined,
        limit: 50,
      });
      setObservations(res.observations);
      if (res.observations.length > 0) {
        setSelectedObs(res.observations[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to filter observations");
    } finally {
      setLoading(false);
    }
  };

  // Handle custom coordinates search
  const handleSearchCoords = async (ra: number, dec: number, targetName?: string) => {
    setSearching(true);
    setError(null);
    try {
      const res = await api.searchObservations({ ra, dec, radiusDeg: 0.25 });
      if (res.status === "cached" && res.observations && res.observations.length > 0) {
        setObservations(res.observations);
        setSelectedObs(res.observations[0]);
      } else if (res.jobId) {
        // Poll job
        const job = await api.getJob(res.jobId);
        if (job.status === "completed") {
          const obsList = await api.listObservations({ limit: 20 });
          setObservations(obsList.observations);
          setSelectedObs(obsList.observations[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to search coordinates in archive.");
    } finally {
      setSearching(false);
    }
  };

  // Next / Prev observation
  const currentObsIndex = selectedObs
    ? observations.findIndex((o) => o.id === selectedObs.id)
    : -1;

  const handleNextObs = () => {
    if (currentObsIndex < observations.length - 1) {
      setSelectedObs(observations[currentObsIndex + 1]);
    }
  };

  const handlePrevObs = () => {
    if (currentObsIndex > 0) {
      setSelectedObs(observations[currentObsIndex - 1]);
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Explore data unavailable"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col gap-4 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <CoordinateSearch onSearch={handleSearchCoords} loading={searching} />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2 border-t border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Regions:</span>
            <RegionSelector
              regions={regions}
              selectedSlug={selectedRegion?.slug}
              onSelect={handleSelectRegion}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Filter:</span>
            <BandSelector
              selectedBand={selectedBand}
              onSelectBand={handleSelectBand}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Viewer + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Main Sky Viewer */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="p-4 rounded-3xl bg-slate-950/70 border border-slate-800">
            {loading ? (
              <Skeleton className="w-full h-[520px] rounded-2xl" />
            ) : selectedObs ? (
              <SkyImageViewer
                observationId={selectedObs.id}
                alt={selectedObs.archive_id}
                ra={selectedObs.ra}
                dec={selectedObs.dec}
                className="w-full h-[520px]"
              />
            ) : (
              <div className="flex items-center justify-center h-[520px] text-slate-400 text-xs">
                No observation selected.
              </div>
            )}

            {/* Viewer Footer Bar */}
            {selectedObs && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 mt-3 border-t border-slate-900 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-white">
                    {formatDate(selectedObs.observation_date)}
                  </span>
                  <span className="text-indigo-400 font-mono">
                    Band {selectedObs.band_number} ({formatWavelength(selectedObs.wavelength_min_um, selectedObs.wavelength_max_um)})
                  </span>
                  <span className="text-slate-400 font-mono">
                    {formatCoords(selectedObs.ra, selectedObs.dec)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePrevObs}
                    disabled={currentObsIndex <= 0}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 transition"
                    title="Previous Observation"
                  >
                    <RiArrowLeftLine className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono text-slate-400 px-1">
                    {currentObsIndex + 1} / {observations.length}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextObs}
                    disabled={currentObsIndex >= observations.length - 1}
                    className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-slate-300 transition"
                    title="Next Observation"
                  >
                    <RiArrowRightLine className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Context CTAs */}
          {selectedObs && (
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800">
              <span className="text-xs text-slate-300">
                Want to investigate temporal changes for this field?
              </span>

              <div className="flex items-center gap-3">
                <Link
                  href={`/timeline?region=${selectedRegion?.slug || "m31"}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                >
                  <RiTimeLine className="text-sky-400" />
                  <span>Open in Timeline</span>
                </Link>

                <Link
                  href={`/compare?a=${selectedObs.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-medium text-white shadow-md shadow-purple-950/20 transition"
                >
                  <RiContrast2Line />
                  <span>Compare this Epoch</span>
                </Link>
              </div>
            </div>
          )}

          {/* Metadata Panel */}
          <MetadataPanel observation={selectedObs} />
        </div>

        {/* Right: Observation Strip Gallery */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">
              Epoch Observations ({observations.length})
            </h3>
            <span className="text-[11px] font-mono text-slate-400">
              {selectedRegion?.name}
            </span>
          </div>

          <ObservationStrip
            observations={observations}
            selectedId={selectedObs?.id}
            onSelect={(obs) => setSelectedObs(obs)}
            orientation="vertical"
          />
        </div>
      </div>
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-96 rounded-3xl" />}>
      <ExploreContent />
    </Suspense>
  );
}
