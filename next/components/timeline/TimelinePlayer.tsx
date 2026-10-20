"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RiArrowLeftLine, RiArrowRightLine, RiPauseFill, RiPlayFill } from "react-icons/ri";
import { SkyImage } from "@/components/sky/SkyImage";
import { findEpochPair } from "@/lib/observationPairs";
import { formatCoords, formatDate, formatShortDate, formatWavelength } from "@/lib/format";
import { elapsedCalendarDays, groupObservationsByDayAndBand, observationDay, sortObservations, timelinePosition } from "@/lib/timelineModel";
import type { Observation } from "@/lib/types";

type TimelinePlayerProps = {
  observations: Observation[];
  band: number;
  onBandChange: (band: number) => void;
  fieldName: string;
};

function archiveSearchUrl(observation: Observation) {
  return `https://irsa.ipac.caltech.edu/applications/spherex/?api=spectral-images&ra=${encodeURIComponent(observation.ra)}&dec=${encodeURIComponent(observation.dec)}&sr=15m&spatialRegionOperation=intersects`;
}

function FieldPositions({ observations, current }: { observations: Observation[]; current: Observation }) {
  const offsets = observations.map(item => ({
    id: item.id,
    x: ((item.ra - current.ra + 540) % 360) - 180,
    y: item.dec - current.dec,
  }));
  const extentX = Math.max(.025, ...offsets.map(point => Math.abs(point.x * Math.cos(current.dec * Math.PI / 180))));
  const extentY = Math.max(.025, ...offsets.map(point => Math.abs(point.y)));
  return <div className="timeline-positions">
    <div className="timeline-card-label">POINTING CENTERS / SAME FIELD</div>
    <svg viewBox="0 0 180 120" role="img" aria-label="Approximate centers of the available cutouts; selected observation is highlighted">
      <path d="M90 10v100M10 60h160" stroke="#7588b850" strokeWidth="1"/>
      <circle cx="90" cy="60" r="47" fill="none" stroke="#91a8da3a" strokeDasharray="3 5"/>
      {offsets.filter(point => point.id !== current.id).map(point => <circle key={point.id} cx={90 + point.x * Math.cos(current.dec * Math.PI / 180) / extentX * 65} cy={60 - point.y / extentY * 43} r="3" fill="#8795bf" opacity=".7"/>)}
      <circle cx="90" cy="60" r="6" fill="#b7f6ee" stroke="#10253a" strokeWidth="2"/>
    </svg>
    <p>Selected center in mint. Relative positions only; this is not a registered image overlay.</p>
  </div>;
}

export function TimelinePlayer({ observations, band, onBandChange, fieldName }: TimelinePlayerProps) {
  const ordered = sortObservations(observations);
  const bands = [...new Set(ordered.map(item => item.band_number))].sort((a, b) => a - b);
  const bandObservations = ordered.filter(item => item.band_number === band);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [enhanced, setEnhanced] = useState(false);
  const current = bandObservations.find(item => item.id === activeId) ?? bandObservations[0];
  const index = Math.max(0, bandObservations.findIndex(item => item.id === current?.id));
  const firstDay = observationDay(ordered[0]);
  const lastDay = observationDay(ordered.at(-1)!);
  const groups = groupObservationsByDayAndBand(ordered);
  const pair = current ? findEpochPair(bandObservations, current) : null;
  const partner = pair ? (pair[0].id === current?.id ? pair[1] : pair[0]) : null;

  useEffect(() => {
    const onVisibilityChange = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    if (!playing || bandObservations.length < 2) return;
    if (index >= bandObservations.length - 1) return;
    const timer = window.setTimeout(() => {
      setActiveId(bandObservations[index + 1].id);
      if (index + 1 === bandObservations.length - 1) setPlaying(false);
    }, 1800 / speed);
    return () => window.clearTimeout(timer);
  }, [playing, speed, index, bandObservations]);

  if (!current) return <div className="mission-empty">No dates are available in this detector band.</div>;

  const selectObservation = (observation: Observation) => {
    setPlaying(false);
    setActiveId(observation.id);
    if (observation.band_number !== band) onBandChange(observation.band_number);
  };
  const move = (delta: number) => {
    const next = bandObservations[Math.max(0, Math.min(bandObservations.length - 1, index + delta))];
    if (next) selectObservation(next);
  };
  const activeDate = observationDay(current);
  const previous = bandObservations[index - 1];
  const gap = previous ? elapsedCalendarDays(observationDay(previous), activeDate) : null;
  const range = `${formatShortDate(`${firstDay}T00:00:00Z`)} — ${formatShortDate(`${lastDay}T00:00:00Z`)}`;

  return <div className="timeline-lens">
    <div className="timeline-map-head"><div><span className="timeline-card-label">WHEN THE TELESCOPE LOOKED</span><strong>{fieldName}</strong><p>Each marker is placed by its real date. A stack means multiple exposures on one day.</p></div><span>{range}</span></div>
    <div className="timeline-map-scroll"><div className="timeline-map" role="group" aria-label="Available observations by date and detector band">
      {bands.map(rowBand => {
        const row = ordered.filter(item => item.band_number === rowBand);
        return <div className={`timeline-map-row ${rowBand === band ? "is-selected" : ""}`} key={rowBand}>
          <button type="button" className="timeline-map-band" aria-pressed={rowBand === band} onClick={() => { setPlaying(false); setActiveId(null); onBandChange(rowBand); }}>D{rowBand}<small>{formatWavelength(Math.min(...row.map(item => item.wavelength_min_um)), Math.max(...row.map(item => item.wavelength_max_um)))}</small></button>
          <div className="timeline-map-track">
            {groups.filter(group => group.band === rowBand).map(group => {
              const item = group.observations[0];
              const selected = group.observations.some(observation => observation.id === current.id);
              return <button type="button" key={`${group.day}-${rowBand}`} className="timeline-map-dot" style={{ left: `${4 + 92 * timelinePosition(group.day, firstDay, lastDay)}%` }} aria-label={`${formatShortDate(item.observation_date)}, detector ${rowBand}, ${group.observations.length} exposure${group.observations.length === 1 ? "" : "s"}`} aria-pressed={selected} title={`${formatShortDate(item.observation_date)} · D${rowBand} · ${group.observations.length} exposure${group.observations.length === 1 ? "" : "s"}`} onClick={() => selectObservation(item)}><span>{group.observations.length > 1 ? group.observations.length : ""}</span></button>;
            })}
          </div>
        </div>;
      })}
      <div className="timeline-map-axis"><span>{formatShortDate(`${firstDay}T00:00:00Z`)}</span><span>ELAPSED CALENDAR TIME</span><span>{formatShortDate(`${lastDay}T00:00:00Z`)}</span></div>
    </div></div>

    <div className="timeline-lens-main">
      <div className="timeline-viewer">
        <div className="timeline-viewer-top"><div><span className="timeline-live-dot"/> ACTUAL SPHEREX CUTOUT</div><div className="timeline-view-switch" role="group" aria-label="Image display"><button type="button" aria-pressed={!enhanced} onClick={() => setEnhanced(false)}>Original</button><button type="button" aria-pressed={enhanced} onClick={() => setEnhanced(true)}>Enhanced</button></div></div>
        <div className={`timeline-viewer-image ${enhanced ? "is-enhanced" : ""}`}><SkyImage key={current.id} observationId={current.id} alt={`SPHEREx infrared cutout observed ${formatShortDate(current.observation_date)} in detector ${current.band_number}`} className="w-full h-full"/></div>
        <div className="timeline-viewer-caption"><span>{enhanced ? "Display contrast and pixel edges emphasized · no new detail created" : `${current.width} × ${current.height} measured pixels · original preview`}</span><span>{index + 1} / {bandObservations.length} in D{band}</span></div>
      </div>
      <aside className="timeline-inspector" aria-label="Selected observation details">
        <div className="timeline-card-label">SELECTED EXPOSURE</div>
        <strong className="timeline-inspector-date">{formatShortDate(current.observation_date)}</strong>
        <span className="timeline-inspector-time">{formatDate(current.observation_date)}</span>
        <dl>
          <div><dt>Detector</dt><dd>D{current.band_number}</dd></div>
          <div><dt>Wavelength range</dt><dd>{formatWavelength(current.wavelength_min_um, current.wavelength_max_um)}</dd></div>
          <div><dt>Image center</dt><dd>{formatCoords(current.ra, current.dec)}</dd></div>
          <div><dt>Since previous in D{band}</dt><dd>{gap === null ? "First in sequence" : `${gap} calendar day${gap === 1 ? "" : "s"}`}</dd></div>
          <div><dt>Exposure ID</dt><dd>{current.archive_id}</dd></div>
        </dl>
        <FieldPositions observations={ordered} current={current}/>
        <a className="timeline-archive-link" href={archiveSearchUrl(current)} target="_blank" rel="noreferrer">Find this position at NASA/IPAC IRSA ↗</a>
      </aside>
    </div>

    <div className="timeline-transport"><div className="timeline-transport-buttons"><button type="button" onClick={() => move(-1)} disabled={index === 0} aria-label="Previous observation"><RiArrowLeftLine/></button><button type="button" className="timeline-transport-play" onClick={() => { if (index === bandObservations.length - 1) setActiveId(bandObservations[0].id); setPlaying(value => !value); }} disabled={bandObservations.length < 2} aria-label={playing ? "Pause timeline" : "Play timeline"}>{playing ? <RiPauseFill/> : <RiPlayFill/>}{playing ? "Pause" : "Play dates"}</button><button type="button" onClick={() => move(1)} disabled={index === bandObservations.length - 1} aria-label="Next observation"><RiArrowRightLine/></button></div><input type="range" min={0} max={Math.max(0, bandObservations.length - 1)} step={1} value={index} disabled={bandObservations.length < 2} aria-label="Scrub observation dates" onChange={event => selectObservation(bandObservations[Number(event.target.value)])}/><label>Speed <select aria-label="Timeline speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={.5}>0.5×</option><option value={1}>1×</option><option value={2}>2×</option></select></label></div>
    <p className="timeline-transport-note">Playback visits only the available cutouts. Display time per frame is even; positions on the date map show the actual intervals. These previews are not pixel-aligned.</p>

    <div className="timeline-exposure-strip" role="group" aria-label="Choose an exposure in the selected detector band">{bandObservations.map((observation, itemIndex) => <button type="button" key={observation.id} aria-pressed={observation.id === current.id} onClick={() => selectObservation(observation)}><SkyImage observationId={observation.id} alt={`Cutout on ${formatShortDate(observation.observation_date)}`} className="timeline-exposure-thumb"/><span>{formatShortDate(observation.observation_date)}</span><small>{itemIndex ? `+${elapsedCalendarDays(observationDay(bandObservations[itemIndex - 1]), observationDay(observation))} days` : "First date"}</small></button>)}</div>

    <div className={`timeline-comparison-readiness ${partner ? "is-ready" : ""}`}><div><span className="timeline-card-label">COMPARISON READINESS</span><strong>{partner ? "A plausible repeat is available" : "No overlap-matched repeat in this band"}</strong><p>{partner ? `This cutout and ${formatShortDate(partner.observation_date)} have overlapping sky coverage and similar wavelength ranges. Pixel registration and quality checks are still needed.` : "A shared field name or detector band is not enough to compare two cutouts. Try another observation or band; playback alone cannot establish a change."}</p></div><Link href={pair ? `/compare?a=${pair[0].id}&b=${pair[1].id}` : "/compare"}>{pair ? "Inspect this pair in Compare" : "Learn how to compare"} <RiArrowRightLine/></Link></div>
  </div>;
}
