import type { Request, Response } from "express";
import {
  getObservationById,
  listObservations,
  searchObservations,
} from "../services/observation.service.js";
import { sendSuccess, sendError } from "../utils/response.js";

export async function search(req: Request, res: Response) {
  const result = await searchObservations(req.body);
  return sendSuccess(res, result);
}

export async function list(req: Request, res: Response) {
  const { regionId, band, limit, offset } = req.query as any;
  const result = await listObservations({
    regionId: regionId ? String(regionId) : undefined,
    band: band !== undefined ? Number(band) : undefined,
    limit: limit ? Number(limit) : undefined,
    offset: offset ? Number(offset) : undefined,
  });
  return sendSuccess(res, result);
}

export async function getById(req: Request, res: Response) {
  const id = String(req.params.id);
  const obs = await getObservationById(id);

  if (!obs) {
    return sendError(
      res,
      "OBSERVATION_NOT_FOUND",
      `Observation not found: ${id}`,
      404
    );
  }

  return sendSuccess(res, obs);
}
