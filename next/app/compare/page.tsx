"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RiFullscreenExitLine, RiFullscreenLine } from "react-icons/ri";
import { FieldGallery } from "@/components/sky/FieldGallery";
import { SkyImage } from "@/components/sky/SkyImage";
import { CompareWorkspace } from "@/components/compare/CompareWorkspace";
import { ChangeSummary } from "@/components/compare/ChangeSummary";
import { ScienceDetails } from "@/components/mission/MissionWorkspace";
import { MissionGuide } from "@/components/mission/MissionGuide";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import { choosePreviewPair, compareReadiness } from "@/lib/compareReadiness";
import { findEpochPair } from "@/lib/observationPairs";
import { angularSeparationDeg } from "@/lib/skyGeometry";
import { formatCoords, formatShortDate, formatWavelength } from "@/lib/format";
import { shortFieldName } from "@/lib/skyFields";
import type { ChangeCandidate, Comparison, Observation, SkyRegion } from "@/lib/types";

function archiveSearchUrl(observation: Observation) {
  return `https://irsa.ipac.caltech.edu/applications/spherex/?api=spectral-images&ra=${encodeURIComponent(observation.ra)}&dec=${encodeURIComponent(observation.dec)}&sr=15m&spatialRegionOperation=intersects`;
}

function SourceImage({ observation, label }: { observation: Observation; label: string }) {
  return <div className="compare-source-card">
    <div className="compare-source-top"><span>{label}</span><strong>{formatShortDate(observation.observation_date)}</strong></div>
    <div className="compare-source-image"><SkyImage observationId={observation.id} alt={`SPHEREx source cutout ${label} from ${formatShortDate(observation.observation_date)}`} className="w-full h-full"/></div>
    <div className="compare-source-data"><span>D{observation.band_number} · {formatWavelength(observation.wavelength_min_um, observation.wavelength_max_um)}</span><span>{observation.width} × {observation.height} measured pixels</span><span>{formatCoords(observation.ra, observation.dec)}</span></div>
    <a href={archiveSearchUrl(observation)} target="_blank" rel="noreferrer">Find this sky position at IRSA ↗</a>
  </div>;
}

function CompareContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [regions, setRegions] = useState<SkyRegion[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [obsA, setObsA] = useState<Observation | null>(null);
  const [obsB, setObsB] = useState<Observation | null>(null);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<ChangeCandidate | null>(null);
  const [revision, setRevision] = useState(0);
  const [mobilePanel, setMobilePanel] = useState<"select" | "view" | "verify">("view");
  const viewerRef = useRef<HTMLElement>(null);
  const [viewerFullscreen, setViewerFullscreen] = useState(false);

  useEffect(() => {
    const syncFullscreen = () => setViewerFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, []);

  const toggleViewerFullscreen = async () => {
    try {
      if (document.fullscreenElement === viewerRef.current) await document.exitFullscreen();
      else await viewerRef.current?.requestFullscreen();
    } catch {
      // Browsers can deny fullscreen outside a trusted user gesture.
    }
  };

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let releaseDelay: (() => void) | undefined;
    async function load() {
      setLoading(true); setError(null); setProgress(null); setComparison(null);
      try {
        const [regionList, archive] = await Promise.all([api.getRegions(), api.listObservations({ limit: 100 })]);
        if (!active) return;
        const items = archive.observations;
        setRegions(regionList); setObservations(items);
        const savedId = params.get("id");
        if (savedId) {
          const saved = await api.getComparison(savedId);
          if (!active) return;
          setObsA(saved.observationA ?? null); setObsB(saved.observationB ?? null);
          setRegionId(saved.observationA?.region_id ?? null);
          setComparison(saved);
          return;
        }
        const requestedRegion = regionList.find(region => region.slug === params.get("region"))
          ?? regionList.find(region => region.slug === "m31") ?? regionList[0];
        const requestedA = items.find(item => item.id === params.get("a"));
        const requestedB = items.find(item => item.id === params.get("b"));
        const inRegion = items.filter(item => item.region_id === requestedRegion?.id);
        const selected = requestedA && requestedB ? [requestedA, requestedB] as [Observation, Observation]
          : requestedA ? findEpochPair(items, requestedA) ?? choosePreviewPair(items.filter(item => item.region_id === requestedA.region_id))
          : findEpochPair(inRegion) ?? choosePreviewPair(inRegion);
        setObsA(selected?.[0] ?? null); setObsB(selected?.[1] ?? null);
        setRegionId(selected?.[0].region_id ?? requestedRegion?.id ?? null);
        if (!selected || !compareReadiness(selected[0], selected[1]).ready) return;
        const result = await api.createComparison(selected[0].id, selected[1].id);
        if (!active) return;
        if (result.status === "completed" && result.comparison) { setComparison(result.comparison); return; }
        if (!result.jobId || !result.comparisonId) throw new Error("The alignment job did not return a result.");
        for (let attempt = 0; attempt < 90 && active; attempt++) {
          const job = await api.getJob(result.jobId);
          if (!active) return;
          setProgress(job.progress);
          if (job.status === "completed") {
            const completed = await api.getComparison(result.comparisonId);
            if (active) setComparison(completed);
            return;
          }
          if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error || "Alignment stopped.");
          await new Promise<void>(resolve => { releaseDelay = resolve; timer = setTimeout(resolve, 2000); });
        }
        if (active) throw new Error("Alignment is taking longer than expected. Try again shortly.");
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "The comparison could not load.");
      } finally {
        if (active) { setLoading(false); setProgress(null); }
      }
    }
    load();
    return () => { active = false; if (timer) clearTimeout(timer); releaseDelay?.(); };
  }, [params, revision]);

  const region = regions.find(item => item.id === regionId);
  const fieldObservations = observations.filter(item => item.region_id === regionId);
  const assessment = obsA && obsB ? compareReadiness(obsA, obsB) : null;
  const baseline = obsA && obsB ? Math.abs(Date.parse(obsB.observation_date) - Date.parse(obsA.observation_date)) / 86400000 : null;
  const separation = obsA && obsB ? angularSeparationDeg(obsA.ra, obsA.dec, obsB.ra, obsB.dec) : null;
  const footprintA = obsA?.metadata_json?.wcs ? Math.hypot(Math.abs(obsA.metadata_json.wcs.cdelt1) * obsA.width * Math.cos(obsA.dec * Math.PI / 180), Math.abs(obsA.metadata_json.wcs.cdelt2) * obsA.height) : null;
  const footprintB = obsB?.metadata_json?.wcs ? Math.hypot(Math.abs(obsB.metadata_json.wcs.cdelt1) * obsB.width * Math.cos(obsB.dec * Math.PI / 180), Math.abs(obsB.metadata_json.wcs.cdelt2) * obsB.height) : null;
  const fieldName = region ? shortFieldName(region) : "the selected field";
  const goToPair = (a: Observation, b: Observation) => router.push(`/compare?a=${encodeURIComponent(a.id)}&b=${encodeURIComponent(b.id)}`);

  return <div className="mission-shell compare-shell"><div className="compare-page">
    <header className="compare-workspace-header">
      <div><span className="compare-kicker">CHRONO &amp; SPATIAL / OBSERVATION WORKSPACE</span><h1>Compare Epochs</h1><p>Choose a field and two dates. Inspect the images, then check whether a change map is scientifically valid.</p></div>
      <div className="compare-workspace-blackhole" aria-hidden="true"><video muted loop autoPlay playsInline preload="metadata" src="/videos/black-hole-stationary-hd.mp4"/></div>
      <a href="https://svs.gsfc.nasa.gov/13326" target="_blank" rel="noreferrer" className="compare-workspace-credit">NASA black hole simulation ↗</a>
    </header>
    <nav className="compare-workspace-mobile-nav" aria-label="Workspace panels"><button type="button" aria-pressed={mobilePanel === "select"} onClick={() => setMobilePanel("select")}>Select</button><button type="button" aria-pressed={mobilePanel === "view"} onClick={() => setMobilePanel("view")}>Viewer</button><button type="button" aria-pressed={mobilePanel === "verify"} onClick={() => setMobilePanel("verify")}>Evidence</button></nav>
    <div className="compare-workspace-grid">
      <aside className="compare-workspace-panel compare-workspace-controls" data-active={mobilePanel === "select"} aria-label="Field and date controls">
        <div className="compare-workspace-panel-title"><span>01 / SELECT</span><h2>Sky field</h2><small>{fieldObservations.length} archive cutouts</small></div>
        <FieldGallery regions={regions} observations={observations} selectedId={regionId ?? undefined} onSelect={selected => router.push(`/compare?region=${encodeURIComponent(selected.slug)}`)}/>
        <div className="compare-workspace-pair-heading"><span>02 / DATES</span><h2>Observation pair</h2></div>
        <div className="compare-pair-controls"><label>First observation<select aria-label="Epoch A observation" value={obsA?.id ?? ""} disabled={loading || !fieldObservations.length} onChange={event => { const next = fieldObservations.find(item => item.id === event.target.value); if (next && obsB) goToPair(next, obsB); }}>{fieldObservations.map(item => <option key={item.id} value={item.id}>{formatShortDate(item.observation_date)} · D{item.band_number}</option>)}</select></label><label>Second observation<select aria-label="Epoch B observation" value={obsB?.id ?? ""} disabled={loading || !fieldObservations.length} onChange={event => { const next = fieldObservations.find(item => item.id === event.target.value); if (obsA && next) goToPair(obsA, next); }}>{fieldObservations.map(item => <option key={item.id} value={item.id}>{formatShortDate(item.observation_date)} · D{item.band_number}</option>)}</select></label><button type="button" className="compare-swap" disabled={!obsA || !obsB || loading} onClick={() => { if (obsA && obsB) goToPair(obsB, obsA); }}>Swap dates ↔</button></div>
        {error && <ErrorState title="The archive or alignment could not load" message={error} onRetry={() => setRevision(value => value + 1)}/>}
      </aside>

      <section ref={viewerRef} className="compare-workspace-panel compare-workspace-viewer compare-results-section" data-active={mobilePanel === "view"} aria-label="Observation viewer">
        <button type="button" className="compare-viewer-fullscreen" aria-label={viewerFullscreen ? "Exit fullscreen viewer" : "Fullscreen viewer"} title={viewerFullscreen ? "Exit fullscreen" : "View fullscreen"} onClick={toggleViewerFullscreen}>{viewerFullscreen ? <RiFullscreenExitLine aria-hidden="true"/> : <RiFullscreenLine aria-hidden="true"/>}</button>
        {loading ? <div className="compare-loading" role="status">{progress === null ? "Loading archive observations…" : `Aligning images… ${Math.round(progress)}%`}</div> : obsA && obsB ? <CompareWorkspace comparison={assessment?.ready ? comparison : null} obsA={obsA} obsB={obsB}/> : <div className="mission-empty">Choose a field with at least two observations.</div>}
      </section>

      <aside className="compare-workspace-panel compare-workspace-inspector" data-active={mobilePanel === "verify"} aria-label="Evidence and source data">
        <div className="compare-workspace-panel-title"><span>04 / VERIFY</span><h2>Pair evidence</h2><small>{fieldName}</small></div>
        {obsA && obsB && assessment && <>
          <div className="compare-pair-summary"><div><span>FIRST</span><strong>{formatShortDate(obsA.observation_date)}</strong></div><div className="compare-pair-baseline"><span>APART</span><strong>{baseline === null ? "—" : `${Math.round(baseline)}d`}</strong></div><div><span>SECOND</span><strong>{formatShortDate(obsB.observation_date)}</strong></div></div>
          <div className={`compare-readiness ${assessment.ready ? "is-ready" : ""}`}><div><span className="compare-small-label">PAIR SCREEN</span><strong>{assessment.ready ? comparison ? "Ready to investigate" : "Alignment pending" : "Source views only"}</strong><p>{assessment.ready ? "Check noise and artifacts before interpreting a signal." : "A change map needs matching dates, wavelength and sky position."}</p></div><ul><li data-pass={assessment.checks.differentDate}>Different dates</li><li data-pass={assessment.checks.sameBand}>Same band</li><li data-pass={assessment.checks.similarWavelength}>Similar wavelength</li><li data-pass={assessment.checks.overlappingSky}>Overlapping sky</li></ul></div>
          {separation !== null && footprintA !== null && footprintB !== null && <div className="compare-sky-distance"><span>SKY GEOMETRY</span><p>Centers: <strong>{separation.toFixed(2)}° apart</strong>. Image diagonals: <strong>{footprintA.toFixed(2)}°</strong> and <strong>{footprintB.toFixed(2)}°</strong>.</p></div>}
          <div className="compare-source-grid"><SourceImage observation={obsA} label="SOURCE A"/><SourceImage observation={obsB} label="SOURCE B"/></div>
          {comparison && <ScienceDetails title="Comparison measurements"><ChangeSummary comparison={comparison} onSelectCandidate={setCandidate}/>{candidate && <div className="inline-notice" role="status">Selected candidate: {candidate.id}. Coordinates: {candidate.ra.toFixed(4)}°, {candidate.dec.toFixed(4)}°. Score: {candidate.score.toFixed(1)}%. {candidate.metadata_json?.note}</div>}</ScienceDetails>}
        </>}
        <ScienceDetails title="Method and interpretation"><p>Two dates alone do not prove change. Their sky footprints and wavelengths must match; aligned images then need noise and artifact checks.</p><p>The local archive is a small sample of real SPHEREx cutouts. When no repeat overlaps, the viewer shows source imagery without generating a change map.</p><a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">NASA/IPAC IRSA SPHEREx data ↗</a></ScienceDetails>
        <details className="guide-drawer"><summary><span>✦ Mission guide</span><span>Help +</span></summary><MissionGuide welcome="Choose two dated SPHEREx cutouts. I will explain the band, wavelength and sky-footprint checks." context={obsA && obsB ? `${fieldName} · D${obsA.band_number} / D${obsB.band_number}` : undefined} topics={[
          { label: "Why these checks?", keywords: ["check", "eligible", "match"], answer: "Two dates alone are not enough. The footprints must overlap and the wavelengths must be similar so a different location or color of light is not mistaken for change." },
          { label: "What is a change map?", keywords: ["map", "difference", "red", "blue"], answer: "After registration and background checks, a difference map shows where the second image is brighter or fainter. It is a lead, not a confirmed discovery." },
          { label: "Can I inspect originals?", keywords: ["original", "source", "archive"], answer: "The source cards link to their NASA/IPAC IRSA sky positions, even when no scientific comparison is possible." },
        ]}/></details>
      </aside>
    </div>
  </div></div>;
}

export default function ComparePage() {
  return <Suspense fallback={<Skeleton className="h-96 rounded-2xl"/>}><CompareContent/></Suspense>;
}
