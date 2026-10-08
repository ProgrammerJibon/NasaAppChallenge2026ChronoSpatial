import type { Request, Response } from "express";
import { query } from "../db/connection.js";
import { sendSuccess, sendError } from "../utils/response.js";
import type { SkyRegionRow } from "../types/index.js";

export async function listRegions(_req: Request, res: Response) {
  const regions = await query<SkyRegionRow>(
    "SELECT * FROM sky_regions ORDER BY is_featured DESC, name ASC"
  );
  return sendSuccess(res, regions);
}

export async function getRegionBySlug(req: Request, res: Response) {
  const slug = String(req.params.slug);
  const [region] = await query<SkyRegionRow>(
    "SELECT * FROM sky_regions WHERE slug = ? OR id = ?",
    [slug, slug]
  );

  if (!region) {
    return sendError(
      res,
      "REGION_NOT_FOUND",
      `Sky region not found: ${slug}`,
      404
    );
  }

  return sendSuccess(res, region);
}
