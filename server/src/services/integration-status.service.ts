import { env } from "../config/env.js";
import {
  IRSA_COLLECTIONS,
  IRSA_SIA_PATH,
  JPL_HORIZONS_URL,
  JPL_SBDB_URL,
  JPL_SB_IDENT_URL,
} from "../config/constants.js";
import type { BootstrapResponse } from "../types/index.js";

/**
 * A single, honest description of which NASA services this deployment talks to
 * and which of them need a credential. `configured` reports only whether a key
 * is present; the key itself is never returned to a client.
 */
export function describeIntegrations(): BootstrapResponse["integrations"] {
  return {
    irsa: {
      archive: "NASA/IPAC IRSA",
      service: "Simple Image Access v2 (ObsCore) + Image Bounded Extraction cutouts",
      endpoint: `${env.IRSA_BASE_URL.replace(/\/+$/, "")}${IRSA_SIA_PATH}`,
      collections: IRSA_COLLECTIONS,
      defaultCollection: env.IRSA_COLLECTION,
      requiresApiKey: false,
    },
    jpl: {
      horizons: JPL_HORIZONS_URL,
      smallBodyDatabase: JPL_SBDB_URL,
      smallBodyIdentification: JPL_SB_IDENT_URL,
      requiresApiKey: false,
    },
    nasaApi: {
      service: "api.nasa.gov NeoWs (JPL near-Earth-object data)",
      configured: env.hasNasaApiKey,
    },
  };
}
