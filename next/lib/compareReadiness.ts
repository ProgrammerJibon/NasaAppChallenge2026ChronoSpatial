import type { Observation } from "./types";
import { cutoutsOverlap } from "./skyGeometry";

export function compareReadiness(a: Observation, b: Observation) {
  const midpointA = (a.wavelength_min_um + a.wavelength_max_um) / 2;
  const midpointB = (b.wavelength_min_um + b.wavelength_max_um) / 2;
  const checks = {
    differentDate: a.id !== b.id && a.observation_date !== b.observation_date,
    sameBand: a.band_number === b.band_number,
    similarWavelength: midpointA > 0 && Math.abs(midpointA - midpointB) / midpointA <= .02,
    overlappingSky: a.region_id === b.region_id && cutoutsOverlap(a, b),
  };
  return { checks, ready: Object.values(checks).every(Boolean) };
}

/** Pick a useful source-image example when the curated sample has no valid repeat. */
export function choosePreviewPair(observations: Observation[]): [Observation, Observation] | null {
  if (observations.length < 2) return null;
  const ordered = [...observations].sort((a, b) => Date.parse(a.observation_date) - Date.parse(b.observation_date));
  let best: [Observation, Observation] | null = null;
  let bestScore = -Infinity;
  for (let i = 0; i < ordered.length; i++) {
    for (let j = i + 1; j < ordered.length; j++) {
      const a = ordered[i], b = ordered[j];
      const days = Math.abs(Date.parse(b.observation_date) - Date.parse(a.observation_date)) / 86400000;
      const score = (a.band_number === b.band_number ? 10000 : 0) + Math.min(days, 2000);
      if (score > bestScore) { best = [a, b]; bestScore = score; }
    }
  }
  return best;
}
