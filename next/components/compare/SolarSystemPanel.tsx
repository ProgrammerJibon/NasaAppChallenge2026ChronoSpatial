"use client";

import React from "react";
import { RiPlanetLine, RiAlertLine, RiLoader4Line, RiRefreshLine } from "react-icons/ri";
import { api, ApiError } from "@/lib/api";
import type { Comparison, MovingObjectMatch } from "@/lib/types";

/**
 * NASA JPL identifications for a comparison.
 *
 * The worker asks JPL's Small-Body Identification service which known minor
 * planets and comets were inside the field at the epoch of the later exposure,
 * then cross-matches them against the change candidates found in the difference
 * image. A match here means a candidate is an already-catalogued body rather
 * than something new.
 */

function formatElement(
  orbit: MovingObjectMatch["orbit"],
  name: string,
  digits = 3
): string | null {
  const element = orbit?.elements?.[name];
  if (!element || element.value === null || element.value === undefined) return null;
  const units = element.units ? ` ${element.units}` : "";
  return `${element.value.toFixed(digits)}${units}`;
}

export function SolarSystemPanel({ comparison }: { comparison: Comparison }) {
  const [matches, setMatches] = React.useState<MovingObjectMatch[]>(comparison.movingObjects ?? []);
  const [status, setStatus] = React.useState<"idle" | "queued" | "working" | "error">("idle");
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMatches(comparison.movingObjects ?? []);
  }, [comparison.id, comparison.movingObjects]);

  const refresh = React.useCallback(async () => {
    try {
      const result = await api.getMovingObjects(comparison.id);
      setMatches(result.matches);
      return result.matches.length;
    } catch {
      return matches.length;
    }
  }, [comparison.id, matches.length]);

  // Guards the polling loop against running on after the panel goes away.
  // React's development strict mode mounts twice, so this has to be re-armed
  // on every mount, not only cleared on unmount.
  const cancelled = React.useRef(false);
  React.useEffect(() => {
    cancelled.current = false;
    return () => {
      cancelled.current = true;
    };
  }, []);

  const runIdentification = React.useCallback(async () => {
    setStatus("working");
    setMessage(null);
    try {
      const { jobId } = await api.requestIdentification(comparison.id);
      setStatus("queued");
      setMessage(
        "Queued with the science worker. JPL refines every candidate orbit numerically, " +
          "so this usually takes under a minute."
      );

      // Follow the worker's own job state rather than guessing from the match
      // count, so "no match" is reported as soon as the pass really finishes.
      for (let attempt = 0; attempt < 60 && !cancelled.current; attempt += 1) {
        await new Promise((resolve) => window.setTimeout(resolve, 3000));
        if (cancelled.current) return;

        const job = await api.getJob(jobId);
        if (job.status === "failed" || job.status === "cancelled") {
          setStatus("error");
          setMessage(job.error || "The identification pass did not finish.");
          return;
        }
        if (job.status !== "completed") continue;

        const found = await refresh();
        setStatus("idle");
        setMessage(
          found > 0
            ? null
            : "JPL found no catalogued solar-system body matching these candidates."
        );
        return;
      }

      if (!cancelled.current) {
        setStatus("idle");
        setMessage(
          "The identification pass is still running. Reopen this comparison shortly to see the result."
        );
      }
    } catch (error) {
      if (cancelled.current) return;
      setStatus("error");
      setMessage(
        error instanceof ApiError
          ? error.message
          : "Could not reach the identification service."
      );
    }
  }, [comparison.id, refresh]);

  const canIdentify = comparison.status === "completed";

  return (
    <section className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <RiPlanetLine className="text-violet-400 w-5 h-5" aria-hidden />
          <div>
            <h4 className="text-sm font-semibold text-slate-100">Solar-system identification</h4>
            <p className="text-[11px] text-slate-400">
              NASA JPL Small-Body Identification, cross-checked against the Small-Body Database
            </p>
          </div>
        </div>
        {canIdentify && (
          <button
            type="button"
            onClick={runIdentification}
            disabled={status === "working" || status === "queued"}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg border border-violet-700/50 bg-violet-950/40 text-violet-200 hover:bg-violet-900/40 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {status === "working" || status === "queued" ? (
              <RiLoader4Line className="w-3.5 h-3.5 animate-spin" aria-hidden />
            ) : (
              <RiRefreshLine className="w-3.5 h-3.5" aria-hidden />
            )}
            {matches.length > 0 ? "Re-run JPL check" : "Ask JPL what was here"}
          </button>
        )}
      </header>

      {message && (
        <p
          className={`text-[11px] leading-relaxed rounded-lg px-3 py-2 border ${
            status === "error"
              ? "text-rose-200 bg-rose-950/30 border-rose-800/40"
              : "text-slate-300 bg-slate-900/60 border-slate-800"
          }`}
          role="status"
        >
          {message}
        </p>
      )}

      {matches.length === 0 ? (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 leading-relaxed">
          <RiAlertLine className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" aria-hidden />
          <p>
            No catalogued minor planet or comet has been matched to this field yet. Candidates
            without a JPL match are the interesting ones: they are either variable sources, an
            uncatalogued moving object, or an instrumental artefact.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 list-none p-0 m-0">
          {matches.map((match) => {
            const orbit = match.orbit;
            // This panel lives in a narrow evidence column, so each figure gets
            // its own row with the label and value pushed apart.
            const rows: Array<[string, React.ReactNode]> = [
              ["Position", `${match.ra.toFixed(4)}°, ${match.dec.toFixed(4)}°`],
            ];
            if (match.apparentMagnitude !== null) {
              rows.push(["Magnitude", `V ${match.apparentMagnitude.toFixed(1)}`]);
            }
            if (match.motionArcsecPerHour !== null) {
              rows.push([
                "Motion",
                <span className="text-sky-300">{match.motionArcsecPerHour.toFixed(1)}″/h</span>,
              ]);
            }
            if (orbit?.orbit_class) rows.push(["Orbit class", orbit.orbit_class]);
            const semiMajor = formatElement(orbit, "a");
            if (semiMajor) rows.push(["Semi-major axis", semiMajor]);
            const eccentricity = formatElement(orbit, "e", 4);
            if (eccentricity) rows.push(["Eccentricity", eccentricity]);
            const inclination = formatElement(orbit, "i", 2);
            if (inclination) rows.push(["Inclination", inclination]);

            return (
              <li
                key={match.id}
                className="p-3.5 rounded-xl bg-slate-900/80 border border-violet-900/40 flex flex-col gap-2"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
                  <span className="text-xs font-semibold text-white">{match.objectName}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-violet-950/60 text-violet-200 border border-violet-800/40 whitespace-nowrap">
                    {match.separationArcsec.toFixed(2)}″ away
                  </span>
                </div>

                <dl className="text-[11px] font-mono text-slate-300 flex flex-col gap-0.5 m-0">
                  {rows.map(([label, value]) => (
                    <div key={label} className="flex items-baseline justify-between gap-3">
                      <dt className="text-slate-500 whitespace-nowrap">{label}</dt>
                      <dd className="m-0 text-right">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="flex flex-wrap items-center gap-1.5">
                  {orbit?.neo && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">
                      Near-Earth object
                    </span>
                  )}
                  {orbit?.pha && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40">
                      Potentially hazardous
                    </span>
                  )}
                  {match.candidateId && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                      {match.candidateId}
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-slate-500 m-0">
                  Epoch {new Date(match.epochUtc).toISOString().replace("T", " ").slice(0, 19)} UTC
                  {" · "}
                  {match.source}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
