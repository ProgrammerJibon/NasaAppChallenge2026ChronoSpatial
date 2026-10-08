import { query } from "../db/connection.js";
import { sha256 } from "../utils/hash.js";
import { createJob } from "./job.service.js";
import { JOB_TYPES } from "../config/constants.js";
import type { ObservationRow } from "../types/index.js";

export async function getObservationById(id: string): Promise<ObservationRow | null> {
  const [obs] = await query<ObservationRow>(
    "SELECT * FROM observations WHERE id = ?",
    [id]
  );
  return obs || null;
}

export interface ListObservationFilters {
  regionId?: string;
  band?: number;
  limit?: number;
  offset?: number;
}

export async function listObservations(
  filters: ListObservationFilters = {}
): Promise<{ observations: ObservationRow[]; total: number }> {
  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.regionId) {
    conditions.push("region_id = ?");
    params.push(filters.regionId);
  }

  if (filters.band !== undefined) {
    conditions.push("band_number = ?");
    params.push(filters.band);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;

  const sql = `SELECT * FROM observations ${whereClause} ORDER BY observation_date ASC LIMIT ? OFFSET ?`;
  const observations = await query<ObservationRow>(sql, [...params, limit, offset]);

  const [countRow] = await query<any>(
    `SELECT COUNT(*) as count FROM observations ${whereClause}`,
    params
  );

  return {
    observations,
    total: Number(countRow?.count || 0),
  };
}

export interface SearchObservationsParams {
  ra: number;
  dec: number;
  radiusDeg: number;
  band?: number | null;
}

export async function searchObservations(
  params: SearchObservationsParams
): Promise<
  | { status: "cached"; observations: ObservationRow[] }
  | { status: "queued"; jobId: string }
> {
  const { ra, dec, radiusDeg, band } = params;

  // Search local DB observations within radius
  // Approximate angular separation in degrees:
  // sqrt((ra1 - ra2)^2 * cos(dec)^2 + (dec1 - dec2)^2) <= radiusDeg
  const cosDec = Math.cos((dec * Math.PI) / 180);
  const whereClauses = [
    "ABS(`dec` - ?) <= ?",
    "ABS((ra - ?) * ?) <= ?",
  ];
  const queryParams: any[] = [dec, radiusDeg, ra, cosDec, radiusDeg];

  if (band !== undefined && band !== null) {
    whereClauses.push("band_number = ?");
    queryParams.push(band);
  }

  const localMatches = await query<ObservationRow>(
    `SELECT * FROM observations
     WHERE ${whereClauses.join(" AND ")}
     ORDER BY observation_date ASC
     LIMIT 50`,
    queryParams
  );

  if (localMatches.length > 0) {
    return {
      status: "cached",
      observations: localMatches,
    };
  }

  // Not cached locally, queue FETCH_OBSERVATIONS job for Python worker
  const queryHash = sha256(`${ra}:${dec}:${radiusDeg}:${band ?? "all"}`);
  const jobId = await createJob(
    JOB_TYPES.FETCH_OBSERVATIONS,
    {
      queryHash,
      ra,
      dec,
      radiusDeg,
      band: band ?? null,
    },
    1 // normal priority
  );

  return {
    status: "queued",
    jobId,
  };
}
