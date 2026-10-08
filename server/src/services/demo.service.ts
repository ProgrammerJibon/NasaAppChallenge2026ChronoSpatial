import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { query, execute } from "../db/connection.js";
import { logger } from "../utils/logger.js";
import type { SkyRegionRow, ObservationRow, ComparisonRow, ChangeCandidateRow } from "../types/index.js";

export interface DemoManifest {
  default_region: string;
  featured_regions: Array<{
    id: string;
    slug: string;
    name: string;
    description: string;
    ra: number;
    dec: number;
    radius_deg?: number;
    is_featured?: boolean;
  }>;
  observations: Array<{
    id: string;
    archive_id: string;
    region_id: string;
    observation_date: string;
    ra: number;
    dec: number;
    band_number: number;
    wavelength_min_um: number;
    wavelength_max_um: number;
    archive_url: string;
    fits_path: string;
    preview_path: string;
    width: number;
    height: number;
    status: string;
    metadata_json: Record<string, unknown>;
  }>;
  comparisons: Array<{
    id: string;
    observation_a_id: string;
    observation_b_id: string;
    status: string;
    aligned_a_path: string;
    aligned_b_path: string;
    difference_path: string;
    significance_path: string;
    summary_json: Record<string, unknown>;
  }>;
  candidates: Array<{
    id: string;
    comparison_id: string;
    x: number;
    y: number;
    ra: number;
    dec: number;
    change_type: string;
    motion_arcsec: number;
    brightness_change: number;
    score: number;
    metadata_json: Record<string, unknown>;
  }>;
}

export async function loadDemoManifest(): Promise<DemoManifest | null> {
  const manifestPath = path.join(env.resolvedStoragePath, "demo", "manifest.json");
  try {
    const raw = await fs.readFile(manifestPath, "utf-8");
    return JSON.parse(raw) as DemoManifest;
  } catch (err) {
    logger.warn(`Could not read demo manifest from ${manifestPath}:`, err);
    return null;
  }
}

export async function seedDemoDataIfNeeded(): Promise<void> {
  const manifest = await loadDemoManifest();
  if (!manifest) {
    logger.warn("Skipping demo seeding: manifest not found.");
    return;
  }

  // 1. Seed sky_regions
  const [regionCountRow] = await query<any>("SELECT COUNT(*) as count FROM sky_regions");
  const regionCount = Number(regionCountRow?.count || 0);

  if (regionCount === 0) {
    logger.info(`Seeding ${manifest.featured_regions.length} featured regions...`);
    for (const r of manifest.featured_regions) {
      await execute(
        `INSERT INTO sky_regions (id, slug, name, description, ra, \`dec\`, radius_deg, is_featured, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
         ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description), ra=VALUES(ra), \`dec\`=VALUES(\`dec\`)`,
        [
          r.id,
          r.slug,
          r.name,
          r.description,
          r.ra,
          r.dec,
          r.radius_deg ?? 0.25,
          r.is_featured ?? true,
        ]
      );
    }
  }

  // 2. Seed observations
  const [obsCountRow] = await query<any>("SELECT COUNT(*) as count FROM observations");
  const obsCount = Number(obsCountRow?.count || 0);

  if (obsCount === 0 && manifest.observations?.length) {
    logger.info(`Seeding ${manifest.observations.length} demo observations...`);
    for (const obs of manifest.observations) {
      await execute(
        `INSERT INTO observations (
          id, archive_id, region_id, observation_date, ra, \`dec\`,
          band_number, wavelength_min_um, wavelength_max_um, archive_url,
          fits_path, preview_path, width, height, status, metadata_json,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [
          obs.id,
          obs.archive_id,
          obs.region_id,
          new Date(obs.observation_date),
          obs.ra,
          obs.dec,
          obs.band_number,
          obs.wavelength_min_um,
          obs.wavelength_max_um,
          obs.archive_url,
          obs.fits_path,
          obs.preview_path,
          obs.width,
          obs.height,
          obs.status || "available",
          JSON.stringify(obs.metadata_json || {}),
        ]
      );
    }
  }

  // 3. Seed comparisons
  const [compCountRow] = await query<any>("SELECT COUNT(*) as count FROM comparisons");
  const compCount = Number(compCountRow?.count || 0);

  if (compCount === 0 && manifest.comparisons?.length) {
    logger.info(`Seeding ${manifest.comparisons.length} demo comparisons...`);
    for (const c of manifest.comparisons) {
      await execute(
        `INSERT INTO comparisons (
          id, observation_a_id, observation_b_id, status,
          aligned_a_path, aligned_b_path, difference_path, significance_path,
          summary_json, created_at, completed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE status=VALUES(status)`,
        [
          c.id,
          c.observation_a_id,
          c.observation_b_id,
          c.status || "completed",
          c.aligned_a_path,
          c.aligned_b_path,
          c.difference_path,
          c.significance_path,
          JSON.stringify(c.summary_json || {}),
        ]
      );
    }
  }

  // 4. Seed candidates
  const [candCountRow] = await query<any>("SELECT COUNT(*) as count FROM change_candidates");
  const candCount = Number(candCountRow?.count || 0);

  if (candCount === 0 && manifest.candidates?.length) {
    logger.info(`Seeding ${manifest.candidates.length} demo change candidates...`);
    for (const cand of manifest.candidates) {
      await execute(
        `INSERT INTO change_candidates (
          id, comparison_id, x, y, ra, \`dec\`,
          change_type, motion_arcsec, brightness_change, score,
          metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, UTC_TIMESTAMP(3))
        ON DUPLICATE KEY UPDATE score=VALUES(score)`,
        [
          cand.id,
          cand.comparison_id,
          cand.x,
          cand.y,
          cand.ra,
          cand.dec,
          cand.change_type,
          cand.motion_arcsec ?? 0,
          cand.brightness_change ?? 0,
          cand.score ?? 0,
          JSON.stringify(cand.metadata_json || {}),
        ]
      );
    }
  }

  logger.info("Demo dataset readiness verified.");
}
