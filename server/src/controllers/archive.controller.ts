import type { Request, Response } from "express";
import {
  buildCutoutUrl,
  describeCollections,
  searchSpherexProducts,
} from "../services/irsa.service.js";
import { UpstreamError } from "../services/nasa-http.js";
import { sendError, sendSuccess } from "../utils/response.js";

/** Live NASA/IPAC IRSA archive discovery, independent of the local database. */

function fail(res: Response, error: unknown, fallbackCode: string) {
  if (error instanceof UpstreamError) {
    return sendError(res, error.code, error.message, error.statusCode, error.details);
  }
  return sendError(
    res,
    fallbackCode,
    error instanceof Error ? error.message : "Unexpected archive failure",
    502
  );
}

export async function collections(_req: Request, res: Response) {
  return sendSuccess(res, describeCollections());
}

export async function search(req: Request, res: Response) {
  try {
    const result = await searchSpherexProducts({
      ra: req.body.ra,
      dec: req.body.dec,
      radiusDeg: req.body.radiusDeg,
      collection: req.body.collection,
      band: req.body.band ?? null,
      limit: req.body.limit,
    });
    return sendSuccess(res, result);
  } catch (error) {
    return fail(res, error, "IRSA_SEARCH_FAILED");
  }
}

export async function cutout(req: Request, res: Response) {
  try {
    const url = buildCutoutUrl(req.body.accessUrl, req.body.ra, req.body.dec, req.body.sizeDeg);
    return sendSuccess(res, {
      cutoutUrl: url,
      centerRa: req.body.ra,
      centerDec: req.body.dec,
      sizeDeg: req.body.sizeDeg,
      service: "NASA/IPAC IRSA Image Bounded Extraction (IBE)",
    });
  } catch (error) {
    return fail(res, error, "IRSA_CUTOUT_FAILED");
  }
}
