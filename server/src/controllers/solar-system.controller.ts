import type { Request, Response } from "express";
import {
  getHorizonsEphemeris,
  getNearEarthObject,
  getSmallBody,
  identifyMovingObjects,
} from "../services/jpl.service.js";
import { UpstreamError } from "../services/nasa-http.js";
import { sendError, sendSuccess } from "../utils/response.js";

/** NASA JPL solar-system endpoints: Horizons, SBDB, sb_ident and NeoWs. */

function fail(res: Response, error: unknown, fallbackCode: string) {
  if (error instanceof UpstreamError) {
    return sendError(res, error.code, error.message, error.statusCode, error.details);
  }
  return sendError(
    res,
    fallbackCode,
    error instanceof Error ? error.message : "Unexpected JPL service failure",
    502
  );
}

export async function identify(req: Request, res: Response) {
  try {
    const result = await identifyMovingObjects({
      ra: req.body.ra,
      dec: req.body.dec,
      halfWidthDeg: req.body.halfWidthDeg,
      obsTime: req.body.obsTime,
      vmagLimit: req.body.vmagLimit,
      twoPass: req.body.twoPass,
    });
    return sendSuccess(res, result);
  } catch (error) {
    return fail(res, error, "JPL_IDENTIFY_FAILED");
  }
}

export async function ephemeris(req: Request, res: Response) {
  const params = req.query as any;
  try {
    const result = await getHorizonsEphemeris({
      target: params.target,
      center: params.center,
      ...(params.epoch
        ? { epochs: [params.epoch] }
        : { start: params.start, stop: params.stop, step: params.step }),
    });
    return sendSuccess(res, result);
  } catch (error) {
    return fail(res, error, "JPL_EPHEMERIS_FAILED");
  }
}

export async function smallBody(req: Request, res: Response) {
  try {
    const result = await getSmallBody(String(req.params.designation));
    return sendSuccess(res, result);
  } catch (error) {
    return fail(res, error, "JPL_SBDB_FAILED");
  }
}

export async function nearEarthObject(req: Request, res: Response) {
  try {
    const result = await getNearEarthObject(String(req.params.identifier));
    return sendSuccess(res, result);
  } catch (error) {
    return fail(res, error, "NEOWS_FAILED");
  }
}
