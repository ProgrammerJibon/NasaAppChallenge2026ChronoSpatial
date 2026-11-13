import { env } from "../config/env.js";
import {
  IRSA_COLLECTIONS,
  IRSA_HOST,
  IRSA_SIA_PATH,
  SPHEREX_BAND_COUNT,
  type IrsaCollection,
} from "../config/constants.js";
import { fetchRemoteJson, UpstreamError } from "./nasa-http.js";

/**
 * NASA/IPAC IRSA Simple Image Access v2 client.
 *
 * This is the platform's live discovery path into the SPHEREx archive. IRSA
 * serves the IVOA ObsCore model over SIA2; asking for `RESPONSEFORMAT=json`
 * returns the same VOTable as a JSON document, which keeps this client free of
 * an XML parser. Pixels are never fetched here — the Python science worker
 * pulls bounded cutouts from the IRSA IBE service.
 */

export interface SpherexProduct {
  archiveId: string;
  obsId: string | null;
  collection: string;
  detector: number;
  bandNumber: number;
  bandpass: string | null;
  observationDate: string;
  observationEnd: string | null;
  mjdStart: number | null;
  mjdEnd: number | null;
  exposureTimeSeconds: number | null;
  ra: number | null;
  dec: number | null;
  wavelengthMinUm: number | null;
  wavelengthMaxUm: number | null;
  spectralResolvingPower: number | null;
  accessUrl: string;
  accessFormat: string | null;
  accessEstimatedSizeKb: number | null;
  calibLevel: number | null;
  dataproductType: string | null;
  dataproductSubtype: string | null;
  instrument: string | null;
  facility: string | null;
  targetName: string | null;
  proposalId: string | null;
  publisherDid: string | null;
  region: string | null;
  pixelScaleArcsec: number | null;
  spatialResolutionArcsec: number | null;
  fieldOfViewDeg: number | null;
  width: number;
  height: number;
  releaseDate: string | null;
}

export interface SpherexSearchResult {
  collection: string;
  ra: number;
  dec: number;
  radiusDeg: number;
  band: number | null;
  totalMatched: number;
  returned: number;
  products: SpherexProduct[];
  epochRange: { start: string; end: string } | null;
  bands: number[];
  fromCache: boolean;
  source: {
    archive: string;
    service: string;
    endpoint: string;
    requiresApiKey: false;
  };
}

interface VoTableField {
  "<xmlattr>"?: { name?: string };
}

interface VoTableResource {
  "<xmlattr>"?: { type?: string };
  INFO?: VoTableInfo | VoTableInfo[];
  INFO_ARRAY?: VoTableInfo[];
  TABLE?: {
    FIELD?: VoTableField | VoTableField[];
    FIELD_ARRAY?: VoTableField[];
    DATA?: { TABLEDATA?: unknown };
  };
}

interface VoTableInfo {
  "<xmlattr>"?: { name?: string; value?: string };
  "#text"?: string;
}

interface VoTableDocument {
  VOTABLE?: {
    RESOURCE?: VoTableResource | VoTableResource[];
    RESOURCE_ARRAY?: VoTableResource[];
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function numeric(value: string | undefined | null): number | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function text(value: string | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isIrsaCollection(value: string): value is IrsaCollection {
  return (IRSA_COLLECTIONS as readonly string[]).includes(value);
}

/** Map an ObsCore bandpass name such as `SPHEREx-D5` onto detector 1..6. */
export function detectorFromBandpass(bandpass: string | null): number {
  if (!bandpass) return 1;
  const token = bandpass.trim().toUpperCase().split("-").pop() ?? "";
  if (token.startsWith("D")) {
    const parsed = Number(token.slice(1));
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= SPHEREX_BAND_COUNT) {
      return parsed;
    }
  }
  return 1;
}

/** Convert a Modified Julian Date to an ISO-8601 UTC timestamp. */
export function mjdToIso(mjd: number | null): string | null {
  if (mjd === null || !Number.isFinite(mjd) || mjd <= 0) return null;
  // MJD 0 is 1858-11-17T00:00:00Z.
  const unixMs = (mjd - 40587) * 86_400_000;
  if (!Number.isFinite(unixMs)) return null;
  const date = new Date(unixMs);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractTable(document: VoTableDocument, endpoint: string) {
  const votable = document.VOTABLE;
  if (!votable) {
    throw new UpstreamError("IRSA_INVALID_RESPONSE", "IRSA returned a document without a VOTABLE root.", 502);
  }

  const resources = [
    ...toArray(votable.RESOURCE_ARRAY),
    ...toArray(votable.RESOURCE),
  ];
  const results = resources.find((resource) => resource["<xmlattr>"]?.type === "results") ?? resources.at(-1);
  if (!results) {
    throw new UpstreamError("IRSA_INVALID_RESPONSE", "IRSA returned no results resource.", 502);
  }

  for (const info of [...toArray(results.INFO_ARRAY), ...toArray(results.INFO)]) {
    if (info["<xmlattr>"]?.name === "QUERY_STATUS" && info["<xmlattr>"]?.value === "ERROR") {
      throw new UpstreamError(
        "IRSA_QUERY_REJECTED",
        `IRSA rejected the archive query: ${info["#text"] ?? "no detail supplied"}`,
        502
      );
    }
  }

  const table = results.TABLE;
  if (!table) {
    return { columns: [] as string[], rows: [] as string[][] };
  }

  const fields = [...toArray(table.FIELD_ARRAY), ...toArray(table.FIELD)];
  const columns = fields.map((field) => field["<xmlattr>"]?.name ?? "");

  const tabledata = table.DATA?.TABLEDATA;
  let rows: string[][] = [];
  if (Array.isArray(tabledata)) {
    rows = (tabledata as unknown[])
      .filter((row): row is unknown[] => Array.isArray(row))
      .map((row) => row.map((cell) => (cell === null || cell === undefined ? "" : String(cell))));
  }

  if (columns.length === 0 && rows.length > 0) {
    throw new UpstreamError(
      "IRSA_INVALID_RESPONSE",
      `IRSA returned table rows without column definitions from ${endpoint}.`,
      502
    );
  }

  return { columns, rows };
}

/** Turn one ObsCore row into the platform's product shape, or null if unusable. */
export function normalizeProduct(record: Record<string, string>, collection: string): SpherexProduct | null {
  const accessUrl = text(record.access_url);
  if (!accessUrl) return null;

  let parsed: URL;
  try {
    parsed = new URL(accessUrl);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || parsed.hostname !== IRSA_HOST) return null;

  const mjdStart = numeric(record.t_min);
  const observationDate = mjdToIso(mjdStart);
  if (!observationDate) return null;

  const obsId = text(record.obs_id) ?? text(record.obs_publisher_did);
  const bandpass = text(record.energy_bandpassname);
  const detector = detectorFromBandpass(bandpass);

  const emMin = numeric(record.em_min);
  const emMax = numeric(record.em_max);

  return {
    // ObsCore reports one row per detector under a shared obs_id, so the
    // detector has to be part of the identity.
    archiveId: obsId ? `${obsId}-D${detector}` : parsed.pathname.split("/").pop() ?? accessUrl,
    obsId,
    collection,
    detector,
    bandNumber: detector,
    bandpass,
    observationDate,
    observationEnd: mjdToIso(numeric(record.t_max)),
    mjdStart,
    mjdEnd: numeric(record.t_max),
    exposureTimeSeconds: numeric(record.t_exptime),
    ra: numeric(record.s_ra),
    dec: numeric(record.s_dec),
    // ObsCore spectral bounds are metres; the platform speaks micrometres.
    wavelengthMinUm: emMin === null ? null : emMin * 1e6,
    wavelengthMaxUm: emMax === null ? null : emMax * 1e6,
    spectralResolvingPower: numeric(record.em_res_power),
    accessUrl,
    accessFormat: text(record.access_format),
    accessEstimatedSizeKb: numeric(record.access_estsize),
    calibLevel: numeric(record.calib_level),
    dataproductType: text(record.dataproduct_type),
    dataproductSubtype: text(record.dataproduct_subtype),
    instrument: text(record.instrument_name),
    facility: text(record.facility_name),
    targetName: text(record.target_name),
    proposalId: text(record.proposal_id),
    publisherDid: text(record.obs_publisher_did),
    region: text(record.s_region),
    pixelScaleArcsec: numeric(record.s_pixel_scale),
    spatialResolutionArcsec: numeric(record.s_resolution),
    fieldOfViewDeg: numeric(record.s_fov),
    width: numeric(record.s_xel1) ?? 0,
    height: numeric(record.s_xel2) ?? 0,
    releaseDate: text(record.obs_release_date),
  };
}

export interface SpherexSearchParams {
  ra: number;
  dec: number;
  radiusDeg: number;
  collection?: string;
  band?: number | null;
  limit?: number;
}

/** Run a positional SPHEREx discovery query against the IRSA SIA2 service. */
export async function searchSpherexProducts(
  params: SpherexSearchParams
): Promise<SpherexSearchResult> {
  const { ra, dec, radiusDeg } = params;
  const collection = params.collection || env.IRSA_COLLECTION;
  const band = params.band ?? null;
  const limit = Math.min(Math.max(params.limit ?? 50, 1), 500);

  if (!(ra >= 0 && ra < 360) || !(dec >= -90 && dec <= 90) || !(radiusDeg > 0 && radiusDeg <= 1)) {
    throw new UpstreamError(
      "IRSA_INVALID_QUERY",
      "Right ascension must be in [0, 360), declination in [-90, 90] and the radius in (0, 1] degrees.",
      400
    );
  }
  if (!isIrsaCollection(collection)) {
    throw new UpstreamError(
      "IRSA_UNKNOWN_COLLECTION",
      `Unknown SPHEREx collection '${collection}'. Expected one of: ${IRSA_COLLECTIONS.join(", ")}.`,
      400
    );
  }

  const endpoint = `${env.IRSA_BASE_URL.replace(/\/+$/, "")}${IRSA_SIA_PATH}`;
  const { data, fromCache } = await fetchRemoteJson<VoTableDocument>(
    endpoint,
    {
      COLLECTION: collection,
      POS: `CIRCLE ${ra} ${dec} ${radiusDeg}`,
      RESPONSEFORMAT: "json",
    },
    {
      allowedHosts: [IRSA_HOST],
      timeoutMs: env.IRSA_TIMEOUT_MS,
      label: "irsa-sia",
      cacheTtlSeconds: env.IRSA_CACHE_TTL_SECONDS,
    }
  );

  const { columns, rows } = extractTable(data, endpoint);

  const seen = new Set<string>();
  const products: SpherexProduct[] = [];
  for (const row of rows) {
    const record: Record<string, string> = {};
    columns.forEach((name, index) => {
      if (name) record[name] = row[index] ?? "";
    });

    const product = normalizeProduct(record, collection);
    if (!product) continue;
    if (band !== null && product.bandNumber !== band) continue;
    if (seen.has(product.archiveId)) continue;
    seen.add(product.archiveId);
    products.push(product);
  }

  products.sort((a, b) => a.observationDate.localeCompare(b.observationDate));

  const totalMatched = products.length;
  const limited = products.slice(0, limit);

  return {
    collection,
    ra,
    dec,
    radiusDeg,
    band,
    totalMatched,
    returned: limited.length,
    products: limited,
    epochRange: totalMatched > 0
      ? { start: products[0].observationDate, end: products[totalMatched - 1].observationDate }
      : null,
    bands: [...new Set(products.map((product) => product.bandNumber))].sort((a, b) => a - b),
    fromCache,
    source: {
      archive: "NASA/IPAC IRSA",
      service: "Simple Image Access v2 (ObsCore)",
      endpoint,
      requiresApiKey: false,
    },
  };
}

/** Build the IRSA IBE cutout URL the science worker downloads for a product. */
export function buildCutoutUrl(accessUrl: string, ra: number, dec: number, sizeDeg: number): string {
  const url = new URL(accessUrl);
  if (url.protocol !== "https:" || url.hostname !== IRSA_HOST) {
    throw new UpstreamError("IRSA_URL_REJECTED", "Cutouts may only be built for IRSA archive URLs.", 400);
  }
  if (!(ra >= 0 && ra < 360) || !(dec >= -90 && dec <= 90)) {
    throw new UpstreamError("IRSA_INVALID_QUERY", "Invalid cutout centre coordinates.", 400);
  }
  if (!(sizeDeg > 0 && sizeDeg <= 0.5)) {
    throw new UpstreamError("IRSA_INVALID_QUERY", "Cutout size must be within (0, 0.5] degrees.", 400);
  }
  url.searchParams.set("center", `${ra.toFixed(6)},${dec.toFixed(6)}`);
  url.searchParams.set("size", sizeDeg.toFixed(6));
  return url.toString();
}

export function describeCollections() {
  return {
    collections: IRSA_COLLECTIONS.map((name) => ({
      name,
      default: name === env.IRSA_COLLECTION,
      release: name.includes("dr1") ? "Data Release 1" : "Quick Release 3",
      kind: name.endsWith("_deep") ? "deep coadd" : name.endsWith("_cube") ? "spectral cube" : "level-2 exposure",
    })),
    defaultCollection: env.IRSA_COLLECTION,
    archive: "NASA/IPAC IRSA",
    service: "Simple Image Access v2 (ObsCore)",
    endpoint: `${env.IRSA_BASE_URL.replace(/\/+$/, "")}${IRSA_SIA_PATH}`,
    bandCount: SPHEREX_BAND_COUNT,
    requiresApiKey: false,
  };
}
