"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RiArrowRightUpLine, RiCheckLine } from "react-icons/ri";
import { CosmicWebScene } from "@/components/review/CosmicWebScene";
import { SkyImage } from "@/components/sky/SkyImage";
import { SkyImageViewer } from "@/components/sky/SkyImageViewer";
import { Skeleton } from "@/components/ui/Skeleton";
import { api } from "@/lib/api";
import type { Observation, ObservationReview, ObservationReviewClassification, ObservationReviewFlag, ObservationReviewStats, SkyRegion } from "@/lib/types";

const classifications: Array<{value: ObservationReviewClassification; title: string; detail: string}> = [
  { value: "clear", title: "Clear source", detail: "A source is distinct from the background" },
  { value: "faint", title: "Faint source", detail: "A possible source needs a closer look" },
  { value: "artifact", title: "Possible artifact", detail: "The feature may come from imaging effects" },
  { value: "uncertain", title: "Not sure", detail: "There is not enough visual evidence" },
];
const flagOptions: Array<{value: ObservationReviewFlag; label: string}> = [
  { value: "noise", label: "Strong noise" }, { value: "saturation", label: "Saturation" },
  { value: "edge", label: "Near image edge" }, { value: "structured-background", label: "Structured background" },
];

function visitorId() {
  try {
    let id = localStorage.getItem("spx_visitor_id");
    if (!id) { id = `v_${crypto.randomUUID()}`; localStorage.setItem("spx_visitor_id", id); }
    return id;
  } catch { return `v_${crypto.randomUUID()}`; }
}
function dateLabel(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" });
}

export default function ReviewPage() {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [regions, setRegions] = useState<SkyRegion[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fieldFilter, setFieldFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<ObservationReview | null>(null);
  const [stats, setStats] = useState<ObservationReviewStats | null>(null);
  const [classification, setClassification] = useState<ObservationReviewClassification | null>(null);
  const [confidence, setConfidence] = useState(.7);
  const [flags, setFlags] = useState<ObservationReviewFlag[]>([]);
  const [note, setNote] = useState("");
  const visitor = useRef("");
  const requestId = useRef(0);

  const loadArchive = useCallback(async () => {
    setLoading(true); setLoadError(null);
    try {
      const [observationResult, regionResult] = await Promise.all([api.listObservations({limit:100}), api.getRegions()]);
      const available = observationResult.observations.filter(observation => Boolean(observation.preview_path));
      setObservations(available); setRegions(regionResult);
      setSelectedId(previous => previous && available.some(item => item.id === previous) ? previous : available[0]?.id ?? null);
    } catch { setLoadError("The observation archive could not load. Please try again."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { visitor.current = visitorId(); void loadArchive(); }, [loadArchive]);
  useEffect(() => {
    if (!selectedId || !visitor.current) return;
    const current = ++requestId.current;
    setReviewLoading(true); setReviewError(null); setSaved(null);
    setClassification(null); setConfidence(.7); setFlags([]); setNote(""); setStats(null);
    Promise.all([api.getOwnObservationReview(selectedId, visitor.current), api.getObservationReviewStats(selectedId)])
      .then(([mine, summary]) => {
        if (current !== requestId.current) return;
        setSaved(mine); setStats(summary);
        if (mine) { setClassification(mine.classification); setConfidence(mine.confidence); setFlags(mine.flags); setNote(mine.note); }
      })
      .catch(() => { if (current === requestId.current) setReviewError("Review storage is unavailable. Your answer has not been saved."); })
      .finally(() => { if (current === requestId.current) setReviewLoading(false); });
    return () => { requestId.current++; };
  }, [selectedId]);

  const selected = observations.find(observation => observation.id === selectedId) ?? null;
  const regionNames = useMemo(() => new Map(regions.map(region => [region.id, region.name])), [regions]);
  const visibleObservations = observations.filter(observation => fieldFilter === "all" || observation.region_id === fieldFilter);
  const toggleFlag = (flag: ObservationReviewFlag) => setFlags(previous => previous.includes(flag) ? previous.filter(value => value !== flag) : [...previous, flag]);
  const save = async () => {
    if (!selected || !classification || saving || reviewLoading) return;
    setSaving(true); setReviewError(null);
    try {
      const review = await api.saveObservationReview({observationId:selected.id,classification,confidence,flags,note:note.trim()},visitor.current);
      setSaved(review);
      const refreshedStats = await api.getObservationReviewStats(selected.id).catch(() => null);
      if (refreshedStats) setStats(refreshedStats);
    } catch { setReviewError("Your review could not be saved. Please try again; no confirmation has been recorded."); }
    finally { setSaving(false); }
  };

  return <div className="observation-review-page">
    <section className="observation-review-hero" aria-label="Citizen review introduction">
      <div className="observation-review-hero-copy"><span className="mission-eyebrow">CHRONO & SPATIAL / CITIZEN REVIEW</span><h1>Look closely at the real sky.</h1><p>Inspect a SPHEREx observation, record what you can see, and save your assessment for later analysis. Each review stays attached to its exact archive image.</p><div className="observation-review-hero-facts"><span>Real SPHEREx cutouts</span><span>One review per image</span><span>Editable after saving</span></div></div>
      <CosmicWebScene/>
    </section>

    <div className="observation-review-heading"><div><span>THE REVIEW DESK</span><h2>Choose an observation. Record the evidence.</h2></div><p>These are individual images. A single image cannot establish motion or a change between dates.</p></div>
    {loadError ? <div className="observation-review-error" role="alert">{loadError}<button type="button" onClick={loadArchive}>Retry</button></div> : loading ? <Skeleton className="h-[600px] rounded-2xl"/> : selected ? <div className="observation-review-workspace">
      <aside className="observation-review-picker"><div className="review-desk-label">01 / SELECT IMAGE <strong>{observations.length} cutouts</strong></div><label className="observation-review-field">Sky field<select value={fieldFilter} onChange={event=>setFieldFilter(event.target.value)}><option value="all">All fields</option>{regions.filter(region=>observations.some(item=>item.region_id===region.id)).map(region=><option key={region.id} value={region.id}>{region.name}</option>)}</select></label><div className="observation-review-list" role="group" aria-label="Available observations">{visibleObservations.map(observation=><button type="button" key={observation.id} aria-pressed={observation.id===selected.id} onClick={()=>setSelectedId(observation.id)}><SkyImage observationId={observation.id} alt="" className="observation-review-thumb"/><span><strong>{regionNames.get(observation.region_id ?? "") ?? "Sky field"}</strong><small>{dateLabel(observation.observation_date)} · D{observation.band_number}</small></span></button>)}</div></aside>

      <section className="observation-review-image"><div className="observation-review-image-head"><div><span className="review-desk-label">02 / INSPECT</span><h2>{regionNames.get(selected.region_id ?? "") ?? "SPHEREx sky field"}</h2></div><span className="observation-review-band">Detector {selected.band_number}</span></div><SkyImageViewer key={selected.id} observationId={selected.id} alt={`SPHEREx observation ${selected.archive_id}`} className="observation-review-viewer"/><dl className="observation-review-metadata"><div><dt>Observed UTC</dt><dd>{dateLabel(selected.observation_date)}</dd></div><div><dt>Wavelength</dt><dd>{selected.wavelength_min_um.toFixed(2)}–{selected.wavelength_max_um.toFixed(2)} µm</dd></div><div><dt>Center</dt><dd>RA {selected.ra.toFixed(3)}° / Dec {selected.dec.toFixed(3)}°</dd></div><div><dt>Archive ID</dt><dd>{selected.archive_id}</dd></div></dl>{selected.archive_url && <a className="observation-review-source" href={selected.archive_url} target="_blank" rel="noreferrer">View source at NASA/IPAC IRSA <RiArrowRightUpLine/></a>}</section>

      <section className="observation-review-form" aria-label="Observation review form"><span className="review-desk-label">03 / RECORD YOUR ASSESSMENT</span><h2>What do you see?</h2><p>Describe this image only. Your assessment helps prioritize later checks; it is not a confirmed discovery.</p>{reviewLoading ? <Skeleton className="h-[240px] rounded-xl"/> : <><div className="observation-review-choices" role="group" aria-label="Image assessment">{classifications.map(option=><button type="button" key={option.value} aria-pressed={classification===option.value} onClick={()=>setClassification(option.value)}><strong>{option.title}</strong><small>{option.detail}</small></button>)}</div><fieldset className="observation-review-flags"><legend>Anything affecting the view? <span>Optional</span></legend>{flagOptions.map(option=><label key={option.value}><input type="checkbox" checked={flags.includes(option.value)} onChange={()=>toggleFlag(option.value)}/>{option.label}</label>)}</fieldset><label className="observation-review-confidence">How sure are you? <strong>{Math.round(confidence*100)}%</strong><input type="range" min="0.1" max="1" step="0.1" value={confidence} onChange={event=>setConfidence(Number(event.target.value))}/></label><label className="observation-review-note">Evidence note <span>Optional · {note.length}/1000</span><textarea value={note} maxLength={1000} onChange={event=>setNote(event.target.value)} placeholder="What in the image led to your choice? Avoid personal information." rows={3}/></label>{reviewError && <div className="observation-review-error" role="alert">{reviewError}</div>}{saved && <div className="observation-review-saved" role="status"><RiCheckLine/> Review saved for this image. You can update it.</div>}<button type="button" className="observation-review-submit" disabled={!classification || saving} onClick={save}>{saving ? "Saving…" : saved ? "Update saved review" : "Save review"}</button><p className="observation-review-privacy">A random browser ID is used to keep one editable review per image. Notes are stored with the review; please do not include personal information.</p></>}{stats && <div className="observation-review-stats"><strong>{stats.totalReviews} {stats.totalReviews===1 ? "review" : "reviews"} recorded for this image</strong><div>{classifications.map(option=><span key={option.value}>{option.title} <b>{stats.classifications[option.value] ?? 0}</b></span>)}</div></div>}</section>
    </div> : <div className="mission-empty">No observation previews are available for review yet.</div>}
  </div>;
}
