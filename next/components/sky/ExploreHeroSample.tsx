import { SkyImage } from "@/components/sky/SkyImage";
import { formatCoords, formatShortDate, formatWavelength } from "@/lib/format";
import type { Observation } from "@/lib/types";

type ExploreHeroSampleProps = {
  observation?: Observation;
  fieldLabel: string;
  release: string;
};

export function ExploreHeroSample({ observation, fieldLabel, release }: ExploreHeroSampleProps) {
  return <div className="explore-hero-sample" aria-label="How this page turns a real sky observation into an explorable image">
    <div className="explore-hero-sample-head"><span><i className="explore-live-dot"/>REAL OBSERVATION / LIVE SELECTION</span><span>{release}</span></div>
    <div className="explore-hero-sample-body">
      <div className="explore-hero-sample-steps">
        <div><small>01 / SKY FIELD</small><strong>{fieldLabel}</strong><span>{observation ? formatCoords(observation.ra, observation.dec) : "Choose a field below"}</span></div>
        <div><small>02 / INFRARED BAND</small><strong>{observation ? `Detector D${observation.band_number}` : "Awaiting data"}</strong><span>{observation ? formatWavelength(observation.wavelength_min_um, observation.wavelength_max_um) : "Wavelength range"}</span></div>
        <div><small>03 / OBSERVATION</small><strong>{observation ? formatShortDate(observation.observation_date) : "Loading preview"}</strong><span>{observation ? `${observation.width} × ${observation.height} measured pixels` : "NASA/IPAC SPHEREx archive"}</span></div>
      </div>
      <div className="explore-hero-sample-image">
        {observation ? <SkyImage key={observation.id} observationId={observation.id} alt={`Real SPHEREx infrared cutout of ${fieldLabel}, observed ${formatShortDate(observation.observation_date)}`} /> : <span>Archive preview</span>}
        <span className="explore-hero-sample-image-label">ACTUAL INFRARED CUTOUT</span>
      </div>
    </div>
    <div className="explore-hero-sample-foot"><span>Choose a field, band and date to change this view.</span><a href="#explore-observatory-title">Inspect this exposure ↓</a></div>
  </div>;
}
