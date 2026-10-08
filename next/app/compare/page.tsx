"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import type { Comparison, Observation } from "@/lib/types";
import { CompareWorkspace } from "@/components/compare/CompareWorkspace";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { formatShortDate } from "@/lib/format";
import { RiContrast2Line, RiExchangeLine, RiSparklingLine } from "react-icons/ri";

function CompareContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [obsA, setObsA] = useState<Observation | null>(null);
  const [obsB, setObsB] = useState<Observation | null>(null);
  const [allObservations, setAllObservations] = useState<Observation[]>([]);

  const [loading, setLoading] = useState(true);
  const [jobProgress, setJobProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        setError(null);

        const compIdParam = searchParams.get("id");
        const obsAParam = searchParams.get("a");
        const obsBParam = searchParams.get("b");

        // Load all available observations for epoch dropdowns
        const obsListRes = await api.listObservations({ limit: 100 });
        setAllObservations(obsListRes.observations);

        // Case 1: Specific comparison ID provided
        if (compIdParam) {
          const comp = await api.getComparison(compIdParam);
          setComparison(comp);
          if (comp.observationA) setObsA(comp.observationA);
          if (comp.observationB) setObsB(comp.observationB);
          setLoading(false);
          return;
        }

        // Case 2: Specific pair A & B provided
        if (obsAParam && obsBParam) {
          const res = await api.createComparison(obsAParam, obsBParam);
          if (res.status === "completed" && res.comparison) {
            setComparison(res.comparison);
            if (res.comparison.observationA) setObsA(res.comparison.observationA);
            if (res.comparison.observationB) setObsB(res.comparison.observationB);
            setLoading(false);
            return;
          } else if (res.jobId) {
            // Poll comparison job
            pollComparisonJob(res.jobId, res.comparisonId || "");
            return;
          }
        }

        // Case 3: Default bootstrap comparison
        const bs = await api.getBootstrap();
        if (bs.demoComparisonId) {
          const comp = await api.getComparison(bs.demoComparisonId);
          setComparison(comp);
          if (comp.observationA) setObsA(comp.observationA);
          if (comp.observationB) setObsB(comp.observationB);
          router.replace(`/compare?id=${bs.demoComparisonId}`);
        } else if (obsListRes.observations.length >= 2) {
          // Fallback to first two observations
          const a = obsListRes.observations[0];
          const b = obsListRes.observations[1];
          setObsA(a);
          setObsB(b);
          const res = await api.createComparison(a.id, b.id);
          if (res.status === "completed" && res.comparison) {
            setComparison(res.comparison);
          } else if (res.jobId) {
            pollComparisonJob(res.jobId, res.comparisonId || "");
            return;
          }
        }
      } catch (err: any) {
        setError(err instanceof ApiError ? err.message : "Failed to load epoch comparison workspace.");
      } finally {
        setLoading(false);
      }
    }

    async function pollComparisonJob(jobId: string, comparisonId: string) {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const job = await api.getJob(jobId);
          setJobProgress(job.progress);
          if (job.status === "completed") {
            clearInterval(interval);
            const comp = await api.getComparison(comparisonId);
            setComparison(comp);
            if (comp.observationA) setObsA(comp.observationA);
            if (comp.observationB) setObsB(comp.observationB);
            setLoading(false);
            setJobProgress(null);
          } else if (job.status === "failed") {
            clearInterval(interval);
            setError(job.error || "Science worker failed to compare epochs.");
            setLoading(false);
            setJobProgress(null);
          }
        } catch {
          if (attempts > 60) {
            clearInterval(interval);
            setError("Comparison processing timed out.");
            setLoading(false);
            setJobProgress(null);
          }
        }
      }, 2000);
    }

    init();
  }, [searchParams, router]);

  const handleSwapEpochs = () => {
    if (!obsA || !obsB) return;
    router.push(`/compare?a=${obsB.id}&b=${obsA.id}`);
  };

  const handleChangeEpochA = (id: string) => {
    if (!obsB) return;
    router.push(`/compare?a=${id}&b=${obsB.id}`);
  };

  const handleChangeEpochB = (id: string) => {
    if (!obsA) return;
    router.push(`/compare?a=${obsA.id}&b=${id}`);
  };

  if (error) {
    return (
      <ErrorState
        title="Comparison unavailable"
        message={error}
        onRetry={() => window.location.reload()}
        secondaryAction={
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/compare")}
          >
            Load Default Demo Pair
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Epoch Selection Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RiContrast2Line className="text-purple-400 w-5 h-5" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Change Comparison Workspace
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Compare two observation epochs with aligned WCS reprojection, swipe/blink modes, and scientific flux delta maps.
          </p>
        </div>

        {/* Pair selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Epoch A select */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-sky-400 font-bold">Epoch A:</span>
            <select
              value={obsA?.id || ""}
              onChange={(e) => handleChangeEpochA(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {allObservations.map((o) => (
                <option key={o.id} value={o.id} className="bg-slate-900 text-slate-200">
                  {formatShortDate(o.observation_date)} (Band {o.band_number})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleSwapEpochs}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            title="Swap Epoch A and B"
          >
            <RiExchangeLine className="w-4 h-4" />
          </button>

          {/* Epoch B select */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <span className="text-purple-400 font-bold">Epoch B:</span>
            <select
              value={obsB?.id || ""}
              onChange={(e) => handleChangeEpochB(e.target.value)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
            >
              {allObservations.map((o) => (
                <option key={o.id} value={o.id} className="bg-slate-900 text-slate-200">
                  {formatShortDate(o.observation_date)} (Band {o.band_number})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Workspace Stage */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-3xl bg-slate-950/60 border border-slate-800">
          <div className="w-12 h-12 rounded-full border-4 border-purple-500 border-t-transparent animate-spin mb-4" />
          <h3 className="text-base font-semibold text-white mb-1">
            {jobProgress !== null
              ? `Processing Scientific Difference (${jobProgress.toFixed(0)}%)...`
              : "Aligning and Loading Observations..."}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm text-center">
            Performing celestial WCS bilinear reprojection and statistical source detection.
          </p>
        </div>
      ) : comparison && obsA && obsB ? (
        <CompareWorkspace
          comparison={comparison}
          obsA={obsA}
          obsB={obsB}
        />
      ) : (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
          Please select two epochs to compare.
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-96 rounded-3xl" />}>
      <CompareContent />
    </Suspense>
  );
}
