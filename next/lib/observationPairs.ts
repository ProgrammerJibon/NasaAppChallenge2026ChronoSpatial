import type { Observation } from "./types";
import { cutoutsOverlap } from "./skyGeometry";

/** Screen for plausible repeat images; final analysis still needs pixel-level WCS alignment. */
export function compatibleEpochs(a: Observation, b: Observation): boolean {
  const midpointA = (a.wavelength_min_um + a.wavelength_max_um) / 2;
  const midpointB = (b.wavelength_min_um + b.wavelength_max_um) / 2;
  return a.id !== b.id && a.region_id === b.region_id && a.band_number === b.band_number &&
    a.observation_date !== b.observation_date && midpointA > 0 && cutoutsOverlap(a, b) &&
    Math.abs(midpointA - midpointB) / midpointA <= .02;
}
export function findEpochPair(observations: Observation[], anchor?: Observation): [Observation, Observation] | null {
  const sorted = [...observations].sort((a,b) => Date.parse(a.observation_date) - Date.parse(b.observation_date));
  let result: [Observation, Observation] | null = null;
  let longest = -1;
  for (const a of anchor ? [anchor] : sorted) {
    for (const b of sorted) {
      const baseline = Math.abs(Date.parse(b.observation_date) - Date.parse(a.observation_date));
      if (compatibleEpochs(a,b) && baseline > longest) {
        result = Date.parse(a.observation_date) < Date.parse(b.observation_date) ? [a,b] : [b,a];
        longest = baseline;
      }
    }
  }
  return result;
}
