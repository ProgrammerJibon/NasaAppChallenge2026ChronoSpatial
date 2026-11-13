import { describe, expect, it } from "vitest";
import { choosePreviewPair, compareReadiness } from "../lib/compareReadiness";
import type { Observation } from "../lib/types";

const observation = (id: string, date: string, band = 2, ra = 10) => ({
  id, region_id: "m31", observation_date: date, band_number: band, ra, dec: 39,
  wavelength_min_um: band === 2 ? 1.45 : 2.85,
  wavelength_max_um: band === 2 ? 2.05 : 3.45,
  width: 35, height: 35,
  metadata_json: { wcs: { crval1: ra, crval2: 39, cdelt1: -.0017, cdelt2: .0017, ctype1: "RA---TAN", ctype2: "DEC--TAN" } },
} as Observation);

describe("comparison readiness", () => {
  it("requires repeat dates, a matching band and wavelength, and actual sky overlap", () => {
    const a = observation("a", "2025-07-09");
    expect(compareReadiness(a, observation("b", "2026-07-10")).ready).toBe(true);
    expect(compareReadiness(a, observation("c", "2026-07-10", 2, 11)).checks.overlappingSky).toBe(false);
    expect(compareReadiness(a, observation("d", "2026-07-10", 4)).checks.sameBand).toBe(false);
  });
  it("chooses a same-band, different-date preview before a mixed-band example", () => {
    const pair = choosePreviewPair([observation("a", "2025-07-09"), observation("b", "2026-07-10"), observation("c", "2026-07-11", 4)]);
    expect(pair?.map(item => item.id)).toEqual(["a", "b"]);
  });
});
