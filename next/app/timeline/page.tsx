"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Observation, SkyRegion } from "@/lib/types";
import { TimelinePlayer } from "@/components/timeline/TimelinePlayer";
import { RegionSelector } from "@/components/sky/RegionSelector";
import { BandSelector } from "@/components/sky/BandSelector";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { RiTimeLine, RiInformationLine } from "react-icons/ri";

function TimelineContent() {
  const searchParams = useSearchParams();

  const [regions, setRegions] = useState<SkyRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<SkyRegion | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [selectedBand, setSelectedBand] = useState<number | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

        const regionSlug = searchParams.get("region") || "m31";
        const activeRegion = regList.find((r) => r.slug === regionSlug) || bs.featuredRegion || regList[0];
        setSelectedRegion(activeRegion);

        const obsRes = await api.listObservations({
          regionId: activeRegion.id,
          limit: 100,
        });
        setObservations(obsRes.observations);
      } catch (err: any) {
        setError(err instanceof ApiError ? err.message : "Failed to load timeline observations.");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [searchParams]);

  const handleSelectRegion = async (region: SkyRegion) => {
    setSelectedRegion(region);
    setLoading(true);
    try {
      const res = await api.listObservations({
        regionId: region.id,
        band: selectedBand ?? undefined,
        limit: 100,
      });
      setObservations(res.observations);
    } catch (err: any) {
      setError(err.message || "Failed to load observations for region");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBand = async (band: number | null) => {
    setSelectedBand(band);
    if (!selectedRegion) return;
    setLoading(true);
    try {
      const res = await api.listObservations({
        regionId: selectedRegion.id,
        band: band ?? undefined,
        limit: 100,
      });
      setObservations(res.observations);
    } catch (err: any) {
      setError(err.message || "Failed to filter timeline observations");
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Timeline data unavailable"
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RiTimeLine className="text-sky-400 w-5 h-5" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Temporal Sky Viewer
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Chronological multi-epoch animation. Observe cosmic motion and brightness changes over 6-month survey passes.
          </p>
        </div>

        {/* Region & Band Selectors */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <RegionSelector
            regions={regions}
            selectedSlug={selectedRegion?.slug}
            onSelect={handleSelectRegion}
          />
          <BandSelector
            selectedBand={selectedBand}
            onSelectBand={handleSelectBand}
          />
        </div>
      </div>

      {/* Main Timeline Stage */}
      {loading ? (
        <Skeleton className="w-full h-[600px] rounded-3xl" />
      ) : observations.length > 0 ? (
        <TimelinePlayer observations={observations} />
      ) : (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
          No repeat epochs found for this region/band combination.
        </div>
      )}

      {/* Methodology info */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 leading-relaxed">
        <RiInformationLine className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="text-slate-200 font-semibold block mb-0.5">
            Spatial Stability & Survey Cadence
          </span>
          The image stage is fixed to the celestial coordinate center of the target field.
          SPHEREx surveys each ecliptic region approximately every six months. As you play or step through epochs,
          fast-moving solar system objects will translate across adjacent pixels, while variable stars will pulsate in brightness.
        </div>
      </div>
    </div>
  );
}

export default function TimelinePage() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-96 rounded-3xl" />}>
      <TimelineContent />
    </Suspense>
  );
}
