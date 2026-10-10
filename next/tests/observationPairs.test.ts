import { describe, expect, it } from "vitest";
import { compatibleEpochs, findEpochPair } from "../lib/observationPairs";
import type { Observation } from "../lib/types";
const observation = (id:string,date:string,band=4,region="m31",min=2.85,max=3.45) => ({id,region_id:region,observation_date:date,band_number:band,wavelength_min_um:min,wavelength_max_um:max} as Observation);
describe("temporal comparison selection",() => {
  const a=observation("a","2025-07-09");
  const b=observation("b","2026-07-10");
  it("chooses a same-band pair across time instead of the last mixed-band exposure",() => {
    const pair=findEpochPair([observation("other","2026-07-11",1),b,a]);
    expect(pair?.map(o => o.id)).toEqual(["a","b"]);
  });
  it("rejects self comparisons, identical dates, other regions, and other bands",() => {
    for(const other of [a,observation("same-date","2025-07-09"),observation("region","2026-07-10",4,"orion"),observation("band","2026-07-10",2)]) expect(compatibleEpochs(a,other)).toBe(false);
  });
  it("rejects incompatible wavelengths within a detector band",() => {
    expect(compatibleEpochs(a,observation("wave","2026-07-10",4,"m31",3.1,3.7))).toBe(false);
  });
  it("uses the longest available interval and preserves the selected observation",() => {
    const middle=observation("middle","2025-12-01");
    expect(findEpochPair([b,middle,a])?.map(o=>o.id)).toEqual(["a","b"]);
    expect(findEpochPair([b,middle,a],middle)?.some(o=>o.id==="middle")).toBe(true);
  });
  it("returns no pair when no compatible repeat observation exists",() => {
    expect(findEpochPair([a,observation("other","2026-07-10",2)])).toBeNull();
  });
});
