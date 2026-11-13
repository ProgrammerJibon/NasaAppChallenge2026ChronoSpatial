import { describe, expect, it } from "vitest";
import { angularSeparationDeg, isInFeaturedNeighborhood } from "../lib/skyGeometry";
import type { Observation, SkyRegion } from "../lib/types";

describe("featured sky geography", () => {
  it("handles RA wraparound and high declinations", () => {
    expect(angularSeparationDeg(359.9, 0, 0.1, 0)).toBeCloseTo(0.2, 5);
    expect(angularSeparationDeg(0, 89, 180, 89)).toBeCloseTo(2, 5);
  });

  it("hides exposures assigned to a field many degrees from its center", () => {
    const field = { id: "center", ra: 266.185, dec: -28.153 } as SkyRegion;
    expect(isInFeaturedNeighborhood({ region_id: "center", ra: 266.3, dec: -28.2 } as Observation, field)).toBe(true);
    expect(isInFeaturedNeighborhood({ region_id: "center", ra: 268, dec: 67 } as Observation, field)).toBe(false);
  });
});
