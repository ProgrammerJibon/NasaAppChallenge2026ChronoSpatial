"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FieldGallery } from "@/components/sky/FieldGallery";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
import { TimelinePlayer } from "@/components/timeline/TimelinePlayer";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useSkyArchive } from "@/hooks/useSkyArchive";
import { findEpochPair } from "@/lib/observationPairs";
import { shortFieldName } from "@/lib/skyFields";
import { formatShortDate } from "@/lib/format";
import { observationDay, sortObservations, timelinePosition } from "@/lib/timelineModel";
import { useLanguage } from "@/lib/i18n";

function TimelineContent() {
  const { t } = useLanguage();
  const archive = useSkyArchive();
  const params = useSearchParams();
  const [slug, setSlug] = useState(params.get("region") ?? "m31");
  const [requestedBand, setRequestedBand] = useState<number | null>(null);
  const [details, setDetails] = useState(false);

  useEffect(() => {
    setSlug(params.get("region") ?? "m31");
    setRequestedBand(null);
  }, [params]);

  const region = archive.regions.find(item => item.slug === slug) ?? archive.regions[0];
  const fieldImages = sortObservations(archive.observations.filter(item => item.region_id === region?.id));
  const bestPair = findEpochPair(fieldImages);
  const band = requestedBand ?? bestPair?.[0].band_number ?? fieldImages[0]?.band_number;
  const name = region ? shortFieldName(region) : "this field";
  const first = fieldImages[0];
  const last = fieldImages.at(-1);
  const distinctDays = new Set(fieldImages.map(observationDay)).size;
  const previewDays = [...new Set(fieldImages.map(observationDay))];

  return <MissionWorkspace
    title={t("timelineHeading")}
    subtitle={t("timelineSub")}
    welcome="Choose a real sky field, then follow its observation dates. Matching positions and wavelengths matters before comparing images."
    context={fieldImages.length ? `${name} · ${fieldImages.length} exposures · detector D${band}` : undefined}
    topics={[
      { label: "What does each dot mean?", keywords: ["dot", "map", "date"], answer: "Each dot marks one or more real exposures on that date in that detector band. Its horizontal position shows when the observation happened." },
      { label: "Why compare the same band?", keywords: ["band", "wavelength"], answer: "Different infrared wavelengths can make the sky look different. The detector band is a range, so we also screen the wavelength and image footprint before suggesting a pair." },
      { label: "Does playback show movement?", keywords: ["move", "change", "play"], answer: "Playback steps through actual cutouts without inventing frames. A visual jump is not proof of motion; the images need registration and quality checks." },
      { label: "Where is the source?", keywords: ["source", "archive", "NASA"], answer: "These small previews come from public NASA/IPAC SPHEREx Level-2 images. Open the source link beside the selected exposure for the full archive." },
    ]}
    showIntro={false}
    showJourney={false}
  >
    <div className="timeline-page">
      <header className="timeline-hero">
        <div>
          <span className="timeline-kicker">CHRONO &amp; SPATIAL / THE REAL SKY THROUGH TIME</span>
          <h1>{t("timelineHeading")}</h1>
          <p>{t("timelineSub")}</p>
          <p className="timeline-hero-explainer">Every point below is an available archive exposure. Its position on the date map reflects elapsed time, while rows keep detector bands separate.</p>
        </div>
        <div className="timeline-hero-facts" aria-label="Current field summary">
          <div><span>SELECTED FIELD</span><strong>{name}</strong></div>
          <div><span>AVAILABLE SAMPLE</span><strong>{fieldImages.length || "—"} exposures</strong><small>{distinctDays || "—"} observed dates</small></div>
          <div><span>DATE RANGE</span><strong>{first && last ? `${formatShortDate(first.observation_date)} — ${formatShortDate(last.observation_date)}` : "Loading archive…"}</strong></div>
          {first && last && <div className="timeline-hero-date-preview" aria-label={`${previewDays.length} actual observation dates between ${formatShortDate(first.observation_date)} and ${formatShortDate(last.observation_date)}`}><span>OBSERVED DATES / ACTUAL SPACING</span><div className="timeline-hero-date-track">{previewDays.map(day => <i key={day} title={formatShortDate(`${day}T00:00:00Z`)} style={{left:`${4 + 92 * timelinePosition(day, observationDay(first), observationDay(last))}%`}}/>)}</div></div>}
        </div>
      </header>

      <section className="timeline-field-section" aria-labelledby="timeline-fields-title">
        <div className="timeline-section-heading"><div><span>01 / CHOOSE A FIELD</span><h2 id="timeline-fields-title">Where should we look?</h2></div><p>These are local previews from the public archive. Choose a field to see its actual coverage.</p></div>
        <FieldGallery regions={archive.regions} observations={archive.observations} selectedId={region?.id} onSelect={field => { setSlug(field.slug); setRequestedBand(null); }}/>
      </section>

      <section className="timeline-observation-section" aria-labelledby="timeline-observations-title">
        <div className="timeline-section-heading"><div><span>02 / FOLLOW THE OBSERVATIONS</span><h2 id="timeline-observations-title">A measured sequence</h2></div><p>Select a dot or scrub through the dated images. Gaps in the map are real gaps in this sample.</p></div>
        {archive.error ? <ErrorState title="The timeline could not load" message="Try loading the archive again." onRetry={archive.retry}/>
          : archive.loading ? <Skeleton className="h-[570px] rounded-2xl"/>
          : fieldImages.length && band ? <TimelinePlayer key={region?.id} observations={fieldImages} band={band} onBandChange={setRequestedBand} fieldName={name}/>
          : <div className="mission-empty">No images are available here yet. Try another field.</div>}
      </section>

      <section className="timeline-reading-section" aria-labelledby="timeline-reading-title">
        <div className="timeline-section-heading"><div><span>03 / READ WITH CARE</span><h2 id="timeline-reading-title">What the sequence can tell us</h2></div></div>
        <div className="timeline-reading-grid">
          <div><strong>Dates are measured</strong><p>Each marker comes from an actual observation timestamp. The player does not create frames between dates.</p></div>
          <div><strong>Wavelengths matter</strong><p>A detector band spans a range. Switching bands changes the light being measured as well as the image.</p></div>
          <div><strong>Change needs a check</strong><p>Playback images are not aligned pixel by pixel. Follow an eligible pair into Compare before interpreting a difference.</p></div>
        </div>
        <ScienceDetails open={details} onToggle={setDetails} title="About these SPHEREx observations">
          <p>SPHEREx surveys the sky in 102 infrared wavelengths over repeated all-sky passes. This timeline shows only the cutouts available in this curated sample, not every observation or wavelength.</p>
          <p>Detector bands and dates are read from the selected exposure metadata. A plausible pair has overlapping cutouts and a similar wavelength range; that screen does not replace pixel-level WCS alignment or artifact review.</p>
          <a href="https://irsa.ipac.caltech.edu/Missions/spherex.html" target="_blank" rel="noreferrer">Browse the full NASA/IPAC SPHEREx archive ↗</a>
        </ScienceDetails>
      </section>
    </div>
  </MissionWorkspace>;
}

export default function TimelinePage() {
  return <Suspense fallback={<Skeleton className="h-96 rounded-2xl"/>}><TimelineContent/></Suspense>;
}
