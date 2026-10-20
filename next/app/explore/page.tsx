"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RiArrowRightLine, RiSearchLine } from "react-icons/ri";
import { MissionWorkspace } from "@/components/mission/MissionWorkspace";
import { FieldGallery } from "@/components/sky/FieldGallery";
import { SkyImageViewer } from "@/components/sky/SkyImageViewer";
import { ExploreHeroSample } from "@/components/sky/ExploreHeroSample";
import { GalaxyContextView } from "@/components/sky/GalaxyContextView";
import { ObservationStrip } from "@/components/sky/ObservationStrip";
import { MetadataPanel } from "@/components/sky/MetadataPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useSkyArchive } from "@/hooks/useSkyArchive";
import { api } from "@/lib/api";
import { parseCoordinates } from "@/lib/coordinates";
import { findEpochPair } from "@/lib/observationPairs";
import { shortFieldName, matchSkyField } from "@/lib/skyFields";
import { isInFeaturedNeighborhood } from "@/lib/skyGeometry";
import { formatCoords, formatDate, formatShortDate, formatWavelength } from "@/lib/format";
import type { Observation, SkyRegion } from "@/lib/types";

const lessons = [
  { title: "Read the image", text: "This is a calibrated infrared observation shown as a grayscale preview. Bright pixels represent stronger measured signal. Black areas can also be missing or masked data." },
  { title: "Change wavelength", text: "The six detector bands span different wavelength ranges. SPHEREx builds its 102-wavelength sky survey from many observations; one preview is not a complete spectrum." },
  { title: "Revisit the sky", text: "Compare observations at different times only after matching the sky position and wavelength. A difference is a clue that still needs quality checks." },
] as const;
const featuredOrder = ["pleiades", "orion", "galactic-center", "south-ecliptic-pole", "m31"];

function archiveSearchUrl(ra: number, dec: number) {
  return `https://irsa.ipac.caltech.edu/applications/spherex/?api=spectral-images&ra=${encodeURIComponent(ra)}&dec=${encodeURIComponent(dec)}&sr=15m&spatialRegionOperation=intersects`;
}

function ExploreContent() {
  const archive = useSkyArchive();
  const params = useSearchParams();
  const searchRequest = useRef(0);
  const [slug, setSlug] = useState(params.get("region") ?? "pleiades");
  const [band, setBand] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(params.get("obs"));
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [custom, setCustom] = useState<Observation[] | null>(null);
  const [lesson, setLesson] = useState(0);
  const [viewMode, setViewMode] = useState<"original" | "enhanced" | "3d">("original");

  useEffect(() => {
    setSlug(params.get("region") ?? "pleiades");
    setSelectedId(params.get("obs"));
    setBand(null);
    setCustom(null);
  }, [params]);

  const featuredRegions = [...archive.regions].sort((a, b) =>
    (featuredOrder.indexOf(a.slug) < 0 ? 99 : featuredOrder.indexOf(a.slug)) -
    (featuredOrder.indexOf(b.slug) < 0 ? 99 : featuredOrder.indexOf(b.slug)));
  const verifiedObservations = archive.observations.filter(item =>
    archive.regions.some(candidate => isInFeaturedNeighborhood(item, candidate)));
  const region = archive.regions.find(item => item.slug === slug) ?? featuredRegions[0];
  const fieldImages = (custom ?? verifiedObservations.filter(item => item.region_id === region?.id))
    .slice().sort((a, b) => a.observation_date.localeCompare(b.observation_date));
  const images = fieldImages.filter(item => band === null || item.band_number === band);
  const current = images.find(item => item.id === selectedId) ?? images[0];
  const pair = current ? findEpochPair(fieldImages, current) : null;
  const fieldLabel = custom ? "Coordinate search" : region ? shortFieldName(region) : "Loading sky…";
  const bands = [...new Set(fieldImages.map(item => item.band_number))].sort((a, b) => a - b).map(number => {
    const available = fieldImages.filter(item => item.band_number === number);
    return {
      number,
      min: Math.min(...available.map(item => item.wavelength_min_um)),
      max: Math.max(...available.map(item => item.wavelength_max_um)),
    };
  });
  const release = current?.archive_url?.match(/\/(qr\d+)\//i)?.[1]?.toUpperCase() ?? "Release unspecified";
  const irsaUrl = current ? archiveSearchUrl(current.ra, current.dec) : "https://irsa.ipac.caltech.edu/Missions/spherex.html";

  const chooseField = (field: SkyRegion) => {
    searchRequest.current++;
    setSearching(false);
    setSlug(field.slug);
    setBand(null);
    setSelectedId(null);
    setCustom(null);
    setNotice(null);
  };

  const search = async () => {
    const field = matchSkyField(query, archive.regions);
    if (field) {
      chooseField(field);
      setNotice(`Showing the featured observations of ${shortFieldName(field)}.`);
      return;
    }
    const coordinates = parseCoordinates(query);
    if (!coordinates.isValid) {
      setNotice("Choose a featured field, or enter RA and Dec as two numbers in degrees.");
      return;
    }
    const requestId = ++searchRequest.current;
    setSearching(true);
    try {
      const result = await api.searchObservations({ra: coordinates.ra, dec: coordinates.dec, radiusDeg: 0.25});
      if (searchRequest.current !== requestId) return;
      if (result.status === "cached" && result.observations?.length) {
        setCustom(result.observations);
        setBand(null);
        setSelectedId(null);
        setNotice(`${result.observations.length} matching observations in this curated sample.`);
      } else {
        setNotice("No match in this curated sample. Search the full public archive with the IRSA link below.");
      }
    } catch {
      if (searchRequest.current === requestId) setNotice("The sample search is unavailable. The public IRSA archive remains available below.");
    } finally {
      if (searchRequest.current === requestId) setSearching(false);
    }
  };

  const coordinates = parseCoordinates(query);
  const fullArchiveUrl = coordinates.isValid ? archiveSearchUrl(coordinates.ra, coordinates.dec) : irsaUrl;
  const topics = [
    ...featuredRegions.map((field, index) => ({
      hidden: index >= 3,
      label: `Show ${shortFieldName(field)}`,
      keywords: [shortFieldName(field), field.slug],
      answer: `Let's inspect the available SPHEREx observations of ${shortFieldName(field)}.`,
      action: () => chooseField(field),
    })),
    {label: "What am I seeing?", keywords: ["image", "black", "infrared"], answer: lessons[0].text, action: () => setLesson(0)},
    {label: "What are the bands?", keywords: ["band", "wavelength", "spectrum"], answer: lessons[1].text, action: () => setLesson(1)},
  ];

  return <MissionWorkspace title="Explore the sky" subtitle="Investigate real SPHEREx infrared observations." welcome="Pick a real sky field and I'll help you read the observation." context={current ? `${fieldLabel} · ${images.length} available previews` : undefined} topics={topics} showIntro={false} showJourney={false}>
    <div className="explore-page">
      <header className="explore-hero">
        <div className="explore-hero-copy">
          <span className="explore-kicker">CHRONO & SPATIAL / THE REAL SKY</span>
          <h1>Explore what the telescope saw.</h1>
          <p>Follow the illustrated journey into a real SPHEREx field. Change the detector band, move through observation dates, and inspect the evidence behind every image.</p>
          <div className="explore-hero-facts" aria-label="About this collection">
            <div><strong>{verifiedObservations.length || "—"}</strong><span>real previews</span></div>
            <div><strong>{archive.regions.length || "—"}</strong><span>featured fields</span></div>
            <div><strong>102</strong><span>mission wavelengths*</span></div>
          </div>
        </div>
        <ExploreHeroSample observation={current} fieldLabel={fieldLabel} release={release}/>
      </header>

      <div className="explore-collection-note"><span className="explore-live-dot"/>Real NASA/IPAC SPHEREx Level-2 data <span className="explore-note-divider">·</span> Featured QR3 cutouts within 1° of each field center <span className="explore-note-divider">·</span> <a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">Full public archive ↗</a></div>

      <section className="explore-fields" aria-labelledby="explore-fields-title">
        <div className="explore-section-head"><div><span>01 / CHOOSE A DESTINATION</span><h2 id="explore-fields-title">Find a patch of sky</h2></div><p>These are the fields included in this fast local preview.</p></div>
        <FieldGallery regions={featuredRegions} observations={verifiedObservations} selectedId={custom ? undefined : region?.id} onSelect={chooseField}/>
        <form className="mission-search explore-search" onSubmit={event => {event.preventDefault(); void search();}}>
          <RiSearchLine aria-hidden="true"/>
          <input aria-label="Find a sky field" placeholder="Try Orion, Pleiades, or RA and Dec in degrees" value={query} onChange={event => setQuery(event.target.value)}/>
          <button type="submit" disabled={searching || !query.trim()}>{searching ? "Finding…" : "Find in sample"}</button>
        </form>
        {notice && <p className="inline-notice" role="status">{notice} {coordinates.isValid && <a href={fullArchiveUrl} target="_blank" rel="noreferrer">Search this position at IRSA ↗</a>}</p>}
      </section>

      <section className="explore-observatory" aria-labelledby="explore-observatory-title">
        <div className="explore-section-head"><div><span>02 / INSPECT AN OBSERVATION</span><h2 id="explore-observatory-title">The observatory</h2></div><p>One calibrated image at a time, with its source and context beside it.</p></div>
        {archive.error ? <ErrorState title="Images could not load" message="Try loading the archive again." onRetry={archive.retry}/> : archive.loading ? <Skeleton className="h-[560px] rounded-2xl"/> : current ? <>
          <div className="explore-workspace">
            <div className="explore-image-column">
              <div className="explore-image-toolbar"><div><span className="explore-live-dot"/><strong>{fieldLabel}</strong><small>{formatShortDate(current.observation_date)} · detector {current.band_number}</small></div><div className="explore-view-switch" role="group" aria-label="Observation display mode">{(["original", "enhanced", "3d"] as const).map(mode => <button key={mode} type="button" aria-pressed={viewMode === mode} onClick={() => setViewMode(mode)}>{mode === "3d" ? "3D context" : mode === "enhanced" ? "Enhanced" : "Original"}</button>)}</div></div>
              <div className={`observation-stage explore-image-stage ${viewMode === "enhanced" ? "explore-enhanced" : ""}`}>
                {viewMode === "3d" ? <GalaxyContextView observationId={current.id} fieldLabel={fieldLabel}/> : <SkyImageViewer key={current.id} observationId={current.id} alt={`SPHEREx infrared observation ${current.archive_id}${viewMode === "enhanced" ? ", contrast-enhanced display" : ""}`} className="guided-sky-viewer"/>}
              </div>
              <div className="explore-image-caption"><span>{viewMode === "3d" ? "NASA Spitzer image + conceptual 3D layout · selected cutout from SPHEREx" : `Real infrared cutout · ${current.width} × ${current.height} measured pixels`}</span><span>{viewMode === "enhanced" ? "Contrast and pixel edges emphasized · no new detail created" : viewMode === "3d" ? "3D layout does not measure distance or locate this exposure within the galaxy" : "Scroll to move the page · use viewer controls to zoom"}</span></div>
            </div>
            <aside className="explore-controls" aria-label="Explore this observation">
              <div className="explore-control-block"><span className="explore-control-label">DETECTOR BAND / WAVELENGTH RANGE</span><div className="explore-band-list" role="group" aria-label="Choose an available detector band"><button type="button" aria-pressed={band === null} onClick={() => {setBand(null); setSelectedId(null);}}>All <small>{fieldImages.length}</small></button>{bands.map(item => <button type="button" key={item.number} aria-pressed={band === item.number} onClick={() => {setBand(item.number); setSelectedId(null);}}>D{item.number}<small>{item.min.toFixed(2)}–{item.max.toFixed(2)} µm</small></button>)}</div><p>Only bands with cutouts in this field are shown. A detector band spans a wavelength range; it is not one of the 102 survey wavelength channels.</p></div>
              <div className="explore-control-block"><span className="explore-control-label">THIS EXPOSURE</span><dl className="explore-quick-facts"><div><dt>Observed (UTC)</dt><dd>{formatDate(current.observation_date)}</dd></div><div><dt>Wavelength range</dt><dd>{formatWavelength(current.wavelength_min_um, current.wavelength_max_um)}</dd></div><div><dt>Image center</dt><dd>{formatCoords(current.ra, current.dec)}</dd></div><div><dt>Release / unit</dt><dd>{release} · {String(current.metadata_json?.unit ?? "Unit not provided")}</dd></div><div><dt>Exposure ID</dt><dd>{current.archive_id}</dd></div></dl></div>
              <div className="explore-control-block explore-source-links"><a href={irsaUrl} target="_blank" rel="noreferrer">Find this sky position at IRSA ↗</a><a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">About the public QR3 release ↗</a></div>
            </aside>
          </div>

          <div className="explore-time-rail"><div className="explore-section-head"><div><span>03 / MOVE THROUGH TIME</span><h2>Available observations</h2></div><p>Dates and bands shown here come from this field&apos;s actual cutouts.</p></div><ObservationStrip observations={images} selectedId={current.id} onSelect={item => setSelectedId(item.id)}/></div>
          <div className="explore-next-actions"><div><strong>Ready to test a change?</strong><span>{pair ? "These cutouts overlap on the sky, share a detector band, and were taken on different dates." : "This preview has no verified overlapping repeat at a matching band. A shared field name alone is not enough for a scientific comparison."}</span></div><div>{pair ? <Link className="primary-link" href={`/compare?a=${pair[0].id}&b=${pair[1].id}`}>Compare matching dates <RiArrowRightLine/></Link> : <Link className="primary-link" href="/compare">Learn comparison methods <RiArrowRightLine/></Link>}<Link className="secondary-link" href={`/timeline?region=${region?.slug ?? "pleiades"}`}>Open timeline <RiArrowRightLine/></Link></div></div>

          <details className="science-details explore-details"><summary>Product details and provenance <span>Full metadata</span></summary><div className="science-details-content"><MetadataPanel observation={{...current, archive_url: null}}/><p>These previews show a curated part of the public archive. Use the exposure ID and IRSA sky-position search above to locate the original FITS product, its spectral WCS, quality flags, and variance.</p></div></details>
        </> : <div className="mission-empty">No cutouts in this detector band. Choose another band or sky field.</div>}
      </section>

      <section className="explore-learn" aria-labelledby="explore-learn-title"><div className="explore-section-head"><div><span>04 / MAKE SENSE OF IT</span><h2 id="explore-learn-title">Three questions to ask</h2></div><p>Short explanations stay connected to the observation you are viewing.</p></div><div className="explore-learn-grid"><div className="explore-lesson-tabs" role="tablist" aria-label="Observation guide">{lessons.map((item, index) => <button key={item.title} type="button" role="tab" aria-selected={lesson === index} onClick={() => setLesson(index)}><span>0{index + 1}</span>{item.title}<RiArrowRightLine aria-hidden="true"/></button>)}</div><div className="explore-lesson-copy" role="tabpanel"><span>THE SCIENCE BEHIND THE VIEW</span><h3>{lessons[lesson].title}</h3><p>{lessons[lesson].text}</p><a href="https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/overview.html" target="_blank" rel="noreferrer">Learn how SPHEREx data works ↗</a></div></div></section>

      <div className="explore-full-archive"><span>*SPHEREx maps the sky in 102 infrared wavelengths. These small cutouts are from neighborhoods near named fields; a named object may fall outside an individual cutout. This page does not include every wavelength or public exposure.</span><a href="https://irsa.ipac.caltech.edu/applications/spherex/" target="_blank" rel="noreferrer">Explore the full archive at NASA/IPAC IRSA <RiArrowRightLine/></a></div>
    </div>
  </MissionWorkspace>;
}

export default function ExplorePage() {
  return <Suspense fallback={<Skeleton className="h-96 rounded-2xl"/>}><ExploreContent/></Suspense>;
}
