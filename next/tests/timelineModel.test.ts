import { describe, expect, it } from "vitest";
import { elapsedCalendarDays, groupObservationsByDayAndBand, timelinePosition } from "../lib/timelineModel";
import type { Observation } from "../lib/types";

const sample = (id: string, day: string, band: number) => ({
  id, observation_date: `${day}T12:00:00`, band_number: band,
}) as Observation;

describe("timeline data layout", () => {
  it("preserves the real gap between observations", () => {
    expect(elapsedCalendarDays("2025-07-09", "2026-07-10")).toBe(366);
    expect(timelinePosition("2025-07-10", "2025-07-09", "2026-07-10")).toBeCloseTo(1 / 366);
  });

  it("groups same-day exposures without merging detector bands", () => {
    const groups = groupObservationsByDayAndBand([
      sample("c", "2025-07-10", 4), sample("a", "2025-07-09", 4),
      sample("b", "2025-07-09", 4), sample("d", "2025-07-09", 1),
    ]);
    expect(groups.map(group => [group.day, group.band, group.observations.length])).toEqual([
      ["2025-07-09", 4, 2], ["2025-07-09", 1, 1], ["2025-07-10", 4, 1],
    ]);
  });
});
