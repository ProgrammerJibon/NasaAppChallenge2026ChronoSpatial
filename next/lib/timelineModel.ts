import type { Observation } from "./types";

export function sortObservations(observations: Observation[]): Observation[] {
  return [...observations].sort((a, b) =>
    a.observation_date.localeCompare(b.observation_date) || a.id.localeCompare(b.id));
}

export function observationDay(observation: Observation): string {
  return observation.observation_date.slice(0, 10);
}

export function elapsedCalendarDays(firstDay: string, lastDay: string): number {
  const first = Date.parse(`${firstDay}T00:00:00Z`);
  const last = Date.parse(`${lastDay}T00:00:00Z`);
  if (!Number.isFinite(first) || !Number.isFinite(last)) return 0;
  return Math.max(0, Math.round((last - first) / 86_400_000));
}

export function timelinePosition(day: string, firstDay: string, lastDay: string): number {
  const total = elapsedCalendarDays(firstDay, lastDay);
  return total ? Math.min(1, elapsedCalendarDays(firstDay, day) / total) : .5;
}

export function groupObservationsByDayAndBand(observations: Observation[]) {
  const groups = new Map<string, { day: string; band: number; observations: Observation[] }>();
  for (const observation of sortObservations(observations)) {
    const day = observationDay(observation);
    const key = `${day}:${observation.band_number}`;
    const group = groups.get(key) ?? { day, band: observation.band_number, observations: [] };
    group.observations.push(observation);
    groups.set(key, group);
  }
  return [...groups.values()];
}
