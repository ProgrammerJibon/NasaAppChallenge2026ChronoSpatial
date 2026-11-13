import type { Request, Response } from "express";
import { query } from "../db/connection.js";
import { sendSuccess } from "../utils/response.js";
import { getWorkerStatus } from "../services/job.service.js";
import { describeIntegrations } from "../services/integration-status.service.js";
import { env } from "../config/env.js";
import type { SkyRegionRow, ObservationRow, ComparisonRow, BootstrapResponse } from "../types/index.js";

export async function getBootstrap(_req: Request, res: Response) {
  // 1. Featured region (prioritize m31 demo)
  const [featuredRegion] = await query<SkyRegionRow>(
    "SELECT * FROM sky_regions WHERE is_featured = 1 ORDER BY (slug = 'm31') DESC, id ASC LIMIT 1"
  );

  // 2. Demo observations for featured region or first observations
  let demoObservations: ObservationRow[] = [];
  if (featuredRegion) {
    demoObservations = await query<ObservationRow>(
      "SELECT * FROM observations WHERE region_id = ? ORDER BY observation_date ASC LIMIT 20",
      [featuredRegion.id]
    );
  }
  if (demoObservations.length === 0) {
    demoObservations = await query<ObservationRow>(
      "SELECT * FROM observations ORDER BY observation_date ASC LIMIT 20"
    );
  }

  // 3. Demo comparison
  const [demoComp] = await query<ComparisonRow>(
    "SELECT id FROM comparisons WHERE status = 'completed' ORDER BY created_at DESC LIMIT 1"
  );

  // 4. Worker status
  const workerStatus = await getWorkerStatus();

  const response: BootstrapResponse = {
    featuredRegion: featuredRegion || null,
    demoObservations,
    demoComparisonId: demoComp?.id || null,
    serverStatus: "healthy",
    workerStatus,
    dataSource: {
      label: "NASA/IPAC IRSA SPHEREx Survey",
      archive: "IRSA",
      collection: env.IRSA_COLLECTION,
      level: "Level-2 Calibrated Spectral Images",
      discoveryService: "IVOA Simple Image Access v2 (ObsCore)",
      cutoutService: "IRSA Image Bounded Extraction (IBE)",
    },
    integrations: describeIntegrations(),
  };

  return sendSuccess(res, response);
}
