import type { Observation, SkyRegion } from "./types";

/** Great-circle distance on the sky, including RA wraparound and polar fields. */
export function angularSeparationDeg(raA: number, decA: number, raB: number, decB: number): number {
  if (![raA, decA, raB, decB].every(Number.isFinite)) return Infinity;
  const radians = Math.PI / 180;
  const dec1 = decA * radians;
  const dec2 = decB * radians;
  const deltaDec = (decB - decA) * radians;
  const deltaRa = (raB - raA) * radians;
  const haversine = Math.sin(deltaDec / 2) ** 2 + Math.cos(dec1) * Math.cos(dec2) * Math.sin(deltaRa / 2) ** 2;
  return 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine)))) / radians;
}

/** The local gallery is a neighborhood preview, not an all-sky classification. */
export function isInFeaturedNeighborhood(observation: Observation, region: SkyRegion): boolean {
  return observation.region_id === region.id && angularSeparationDeg(observation.ra, observation.dec, region.ra, region.dec) <= 1;
}

/** A repeat comparison needs actual image overlap, not just a shared region label. */
export function cutoutsOverlap(a: Observation, b: Observation): boolean {
  const scaleA = a.metadata_json?.wcs;
  const scaleB = b.metadata_json?.wcs;
  if (!scaleA || !scaleB) return false;
  const halfWidthA = Math.abs(scaleA.cdelt1) * a.width / 2;
  const halfHeightA = Math.abs(scaleA.cdelt2) * a.height / 2;
  const halfWidthB = Math.abs(scaleB.cdelt1) * b.width / 2;
  const halfHeightB = Math.abs(scaleB.cdelt2) * b.height / 2;
  const overlapRadius = Math.min(Math.hypot(halfWidthA, halfHeightA), Math.hypot(halfWidthB, halfHeightB));
  return Number.isFinite(overlapRadius) && overlapRadius > 0 &&
    angularSeparationDeg(a.ra, a.dec, b.ra, b.dec) <= overlapRadius;
}
