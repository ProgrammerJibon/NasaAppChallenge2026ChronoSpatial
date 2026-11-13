import { env } from "../config/env.js";
import {
  JPL_HORIZONS_URL,
  JPL_HOSTS,
  JPL_SBDB_URL,
  JPL_SB_IDENT_URL,
  NASA_API_HOST,
  NASA_NEOWS_URL,
} from "../config/constants.js";
import { fetchRemoteJson, UpstreamError } from "./nasa-http.js";

/**
 * NASA JPL Solar System Dynamics clients.
 *
 * - Horizons gives observer-centred ephemerides, used to predict where a known
 *   body was at the instant a SPHEREx frame was taken.
 * - The Small-Body Database gives orbital elements and orbit quality.
 * - Small-Body Identification lists every known minor planet or comet inside a
 *   field of view at an epoch, which is how moving objects are identified.
 *
 * None of these three take an API key. NASA_API_KEY is sent only to
 * api.nasa.gov, whose NeoWs service republishes JPL near-Earth-object data.
 */

// --------------------------------------------------------------------------
// Coordinate helpers
// --------------------------------------------------------------------------

/** Format right ascension as the `hh-mm-ss.ss` string sb_ident requires. */
export function formatRaSexagesimal(raDeg: number): string {
  if (!(raDeg >= 0 && raDeg < 360)) {
    throw new UpstreamError("JPL_INVALID_QUERY", "Right ascension must be within [0, 360) degrees.", 400);
  }
  const totalSeconds = (raDeg / 15) * 3600;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - hours * 3600) / 60);
  const seconds = totalSeconds - hours * 3600 - minutes * 60;
  return `${String(hours).padStart(2, "0")}-${String(minutes).padStart(2, "0")}-${seconds.toFixed(2).padStart(5, "0")}`;
}

/** Format declination as `dd-mm-ss.s`; sb_ident spells a minus sign as `M`. */
export function formatDecSexagesimal(decDeg: number): string {
  if (!(decDeg >= -90 && decDeg <= 90)) {
    throw new UpstreamError("JPL_INVALID_QUERY", "Declination must be within [-90, 90] degrees.", 400);
  }
  const sign = decDeg < 0 ? "M" : "";
  const totalSeconds = Math.abs(decDeg) * 3600;
  const degrees = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds - degrees * 3600) / 60);
  const seconds = totalSeconds - degrees * 3600 - minutes * 60;
  return `${sign}${String(degrees).padStart(2, "0")}-${String(minutes).padStart(2, "0")}-${seconds.toFixed(1).padStart(4, "0")}`;
}

const SEXAGESIMAL = /[-+]?\d+(?:\.\d+)?/g;

function sexagesimalParts(value: string): number[] {
  return (String(value).match(SEXAGESIMAL) ?? []).map(Number).filter(Number.isFinite);
}

/** Parse `17:45:54.26` (hours) into degrees. */
export function parseRaSexagesimal(value: string): number {
  const parts = sexagesimalParts(value);
  if (parts.length === 0) {
    throw new UpstreamError("JPL_INVALID_RESPONSE", `Unparsable right ascension: ${value}`, 502);
  }
  const [hours, minutes = 0, seconds = 0] = parts;
  return (Math.abs(hours) + Math.abs(minutes) / 60 + Math.abs(seconds) / 3600) * 15;
}

/** Parse `-28 55'02.5"` into degrees. */
export function parseDecSexagesimal(value: string): number {
  const raw = String(value).trim();
  const parts = sexagesimalParts(raw);
  if (parts.length === 0) {
    throw new UpstreamError("JPL_INVALID_RESPONSE", `Unparsable declination: ${value}`, 502);
  }
  const firstDigit = raw.search(/\d/);
  const prefix = firstDigit >= 0 ? raw.slice(0, firstDigit) : raw;
  const sign = prefix.includes("-") || prefix.toUpperCase().endsWith("M") ? -1 : 1;
  const [degrees, minutes = 0, seconds = 0] = parts;
  return sign * (Math.abs(degrees) + Math.abs(minutes) / 60 + Math.abs(seconds) / 3600);
}

/** Great-circle separation in arcseconds, stable at small angles. */
export function angularSeparationArcsec(raA: number, decA: number, raB: number, decB: number): number {
  const d2r = Math.PI / 180;
  const phiA = decA * d2r;
  const phiB = decB * d2r;
  const delta = (raB - raA) * d2r;
  const numerator = Math.hypot(
    Math.cos(phiB) * Math.sin(delta),
    Math.cos(phiA) * Math.sin(phiB) - Math.sin(phiA) * Math.cos(phiB) * Math.cos(delta)
  );
  const denominator =
    Math.sin(phiA) * Math.sin(phiB) + Math.cos(phiA) * Math.cos(phiB) * Math.cos(delta);
  return (Math.atan2(numerator, denominator) / d2r) * 3600;
}

function toUtcDate(value: string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new UpstreamError("JPL_INVALID_QUERY", `Unparsable epoch: ${String(value)}`, 400);
  }
  return date;
}

function julianDate(date: Date): number {
  return date.getTime() / 86_400_000 + 2440587.5;
}

function numeric(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(String(value).trim().replace(/\.$/, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Reduce an sb_ident label such as `69372 (1994 UA6)` to a lookup key. */
export function designationFromName(name: string): string {
  const trimmed = String(name).trim();
  const leading = /^(\d+)\b/.exec(trimmed);
  if (leading) return leading[1];
  const parenthesised = /\(([^)]+)\)/.exec(trimmed);
  if (parenthesised) return parenthesised[1].trim();
  return trimmed;
}

// --------------------------------------------------------------------------
// Small-Body Database
// --------------------------------------------------------------------------

export interface SmallBodySummary {
  designation: string;
  fullName: string;
  shortName: string | null;
  spkId: string | null;
  neo: boolean;
  pha: boolean;
  kind: string | null;
  orbitClass: string | null;
  orbitId: string | null;
  epochJd: number | null;
  conditionCode: string | null;
  dataArcDays: number | null;
  observationsUsed: number | null;
  firstObservation: string | null;
  lastObservation: string | null;
  elements: Record<string, { value: number | null; sigma: number | null; units: string | null; title: string | null }>;
  physicalParameters: Record<string, { value: number | null; units: string | null; title: string | null }>;
  source: string;
}

export async function getSmallBody(designation: string): Promise<SmallBodySummary> {
  const key = String(designation).trim();
  if (!key) {
    throw new UpstreamError("JPL_INVALID_QUERY", "A small-body designation is required.", 400);
  }

  const { data } = await fetchRemoteJson<any>(
    JPL_SBDB_URL,
    { sstr: key, "phys-par": "1", "full-prec": "1", discovery: "1" },
    {
      allowedHosts: JPL_HOSTS,
      timeoutMs: Math.min(env.JPL_TIMEOUT_MS, 60_000),
      label: "jpl-sbdb",
      cacheTtlSeconds: env.JPL_CACHE_TTL_SECONDS,
    }
  );

  if (!data?.object) {
    throw new UpstreamError(
      "JPL_OBJECT_NOT_FOUND",
      `The JPL Small-Body Database has no object matching '${key}'.`,
      404,
      data?.message
    );
  }

  const orbit = data.orbit ?? {};
  const elements: SmallBodySummary["elements"] = {};
  for (const element of orbit.elements ?? []) {
    if (!element?.name) continue;
    elements[element.name] = {
      value: numeric(element.value),
      sigma: numeric(element.sigma),
      units: element.units ?? null,
      title: element.title ?? null,
    };
  }

  const physicalParameters: SmallBodySummary["physicalParameters"] = {};
  for (const entry of data.phys_par ?? []) {
    if (!entry?.name) continue;
    physicalParameters[entry.name] = {
      value: numeric(entry.value),
      units: entry.units ?? null,
      title: entry.title ?? null,
    };
  }

  return {
    designation: key,
    fullName: String(data.object.fullname ?? key).trim(),
    shortName: data.object.shortname ? String(data.object.shortname).trim() : null,
    spkId: data.object.spkid ? String(data.object.spkid) : null,
    neo: Boolean(data.object.neo),
    pha: Boolean(data.object.pha),
    kind: data.object.kind ?? null,
    orbitClass: data.object.orbit_class?.name ?? null,
    orbitId: orbit.orbit_id ?? null,
    epochJd: numeric(orbit.epoch),
    conditionCode: orbit.condition_code ?? null,
    dataArcDays: numeric(orbit.data_arc),
    observationsUsed: numeric(orbit.n_obs_used),
    firstObservation: orbit.first_obs ?? null,
    lastObservation: orbit.last_obs ?? null,
    elements,
    physicalParameters,
    source: "NASA/JPL Small-Body Database",
  };
}

// --------------------------------------------------------------------------
// Horizons
// --------------------------------------------------------------------------

export interface EphemerisRow {
  timeUtc: string | null;
  raDeg: number | null;
  decDeg: number | null;
  raRateArcsecPerHour: number | null;
  decRateArcsecPerHour: number | null;
  motionArcsecPerHour: number | null;
  apparentMagnitude: number | null;
  surfaceBrightness: number | null;
  heliocentricDistanceAu: number | null;
  observerDistanceAu: number | null;
  observerRangeRateKmS: number | null;
  solarElongationDeg: number | null;
  phaseAngleDeg: number | null;
}

const HORIZONS_COLUMNS: Array<[keyof EphemerisRow, (name: string) => boolean]> = [
  ["timeUtc", (name) => name.startsWith("Date_")],
  ["raDeg", (name) => name.startsWith("R.A.")],
  ["decDeg", (name) => name.startsWith("DEC")],
  ["raRateArcsecPerHour", (name) => name.startsWith("dRA*cosD")],
  ["decRateArcsecPerHour", (name) => name.startsWith("d(DEC)/dt")],
  ["apparentMagnitude", (name) => name === "APmag"],
  ["surfaceBrightness", (name) => name === "S-brt"],
  ["heliocentricDistanceAu", (name) => name === "r"],
  ["observerDistanceAu", (name) => name === "delta"],
  ["observerRangeRateKmS", (name) => name === "deldot"],
  ["solarElongationDeg", (name) => name === "S-O-T"],
  ["phaseAngleDeg", (name) => name === "S-T-O"],
];

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Parse Horizons' `2026-Jan-01 00:00:00.000` timestamps into ISO-8601 UTC. */
export function parseHorizonsTime(value: string): string | null {
  const match = /^(\d{4})-([A-Za-z]{3})-(\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?)?$/.exec(
    String(value).replace(/\*/g, "").trim()
  );
  if (!match) return null;
  const month = MONTHS[match[2].slice(0, 1).toUpperCase() + match[2].slice(1).toLowerCase()];
  if (month === undefined) return null;
  const date = new Date(Date.UTC(
    Number(match[1]),
    month,
    Number(match[3]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0),
    Number(match[6] ?? 0),
    Number((match[7] ?? "0").padEnd(3, "0").slice(0, 3))
  ));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function parseHorizonsResult(result: string): EphemerisRow[] {
  if (!result.includes("$$SOE") || !result.includes("$$EOE")) {
    for (const marker of ["No matches found", "Multiple major-bodies match", "Cannot interpret"]) {
      const index = result.indexOf(marker);
      if (index >= 0) {
        throw new UpstreamError(
          "JPL_TARGET_UNRESOLVED",
          `Horizons could not resolve the target: ${result.slice(index, index + 240).trim()}`,
          404
        );
      }
    }
    throw new UpstreamError("JPL_INVALID_RESPONSE", "Horizons returned no ephemeris block.", 502);
  }

  const head = result.slice(0, result.indexOf("$$SOE"));
  const body = result.slice(result.indexOf("$$SOE") + 5, result.indexOf("$$EOE"));

  const headerLine = head
    .split(/\r?\n/)
    .reverse()
    .find((line) => line.trim().length > 0 && !/^\*+$/.test(line.trim()));
  if (!headerLine) {
    throw new UpstreamError("JPL_INVALID_RESPONSE", "Horizons response has no column header.", 502);
  }

  const headers = headerLine.split(",").map((token) => token.trim());
  const mapping = new Map<number, keyof EphemerisRow>();
  const assigned = new Set<keyof EphemerisRow>();
  headers.forEach((name, index) => {
    if (!name) return;
    for (const [field, predicate] of HORIZONS_COLUMNS) {
      if (assigned.has(field)) continue;
      if (predicate(name)) {
        mapping.set(index, field);
        assigned.add(field);
        return;
      }
    }
  });

  const rows: EphemerisRow[] = [];
  for (const line of body.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const cells = line.split(",").map((cell) => cell.trim());
    const row: EphemerisRow = {
      timeUtc: null, raDeg: null, decDeg: null,
      raRateArcsecPerHour: null, decRateArcsecPerHour: null, motionArcsecPerHour: null,
      apparentMagnitude: null, surfaceBrightness: null,
      heliocentricDistanceAu: null, observerDistanceAu: null, observerRangeRateKmS: null,
      solarElongationDeg: null, phaseAngleDeg: null,
    };
    for (const [index, field] of mapping) {
      const cell = cells[index];
      if (cell === undefined) continue;
      if (field === "timeUtc") {
        row.timeUtc = parseHorizonsTime(cell);
      } else {
        (row[field] as number | null) = numeric(cell);
      }
    }
    if (row.raDeg === null || row.decDeg === null) continue;
    if (row.raRateArcsecPerHour !== null && row.decRateArcsecPerHour !== null) {
      row.motionArcsecPerHour = Math.hypot(row.raRateArcsecPerHour, row.decRateArcsecPerHour);
    }
    rows.push(row);
  }

  if (rows.length === 0) {
    throw new UpstreamError("JPL_INVALID_RESPONSE", "Horizons returned an empty ephemeris.", 502);
  }
  return rows;
}

export interface EphemerisRequest {
  target: string;
  start?: string | Date;
  stop?: string | Date;
  step?: string;
  epochs?: Array<string | Date>;
  center?: string;
  smallBody?: boolean;
}

export interface EphemerisResult {
  target: string;
  center: string;
  rows: EphemerisRow[];
  source: string;
  requiresApiKey: false;
}

export async function getHorizonsEphemeris(request: EphemerisRequest): Promise<EphemerisResult> {
  const target = String(request.target ?? "").trim();
  if (!target) {
    throw new UpstreamError("JPL_INVALID_QUERY", "A Horizons target is required.", 400);
  }
  const center = request.center || "500@399";
  // A trailing semicolon tells Horizons to search the small-body catalogue,
  // which removes the ambiguity between asteroid and major-body designations.
  const command = request.smallBody === false || target.endsWith(";") ? target : `${target};`;

  const params: Record<string, string> = {
    format: "json",
    COMMAND: `'${command}'`,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "OBSERVER",
    CENTER: `'${center}'`,
    QUANTITIES: "'1,3,9,19,20,23,24'",
    CSV_FORMAT: "YES",
    ANG_FORMAT: "DEG",
    EXTRA_PREC: "YES",
  };

  if (request.epochs && request.epochs.length > 0) {
    if (request.epochs.length > 50) {
      throw new UpstreamError("JPL_INVALID_QUERY", "Horizons accepts at most 50 explicit epochs per request.", 400);
    }
    params.TLIST = request.epochs.map((epoch) => julianDate(toUtcDate(epoch)).toFixed(9)).join(" ");
  } else {
    if (!request.start || !request.stop) {
      throw new UpstreamError(
        "JPL_INVALID_QUERY",
        "Provide either an epoch list or both start and stop times.",
        400
      );
    }
    const format = (date: Date) => date.toISOString().slice(0, 19).replace("T", " ");
    params.START_TIME = `'${format(toUtcDate(request.start))}'`;
    params.STOP_TIME = `'${format(toUtcDate(request.stop))}'`;
    params.STEP_SIZE = `'${request.step || "1 d"}'`;
  }

  const { data } = await fetchRemoteJson<any>(JPL_HORIZONS_URL, params, {
    allowedHosts: JPL_HOSTS,
    timeoutMs: Math.min(env.JPL_TIMEOUT_MS, 120_000),
    label: "jpl-horizons",
    cacheTtlSeconds: env.JPL_CACHE_TTL_SECONDS,
  });

  if (data?.error) {
    throw new UpstreamError("JPL_REQUEST_FAILED", `Horizons error: ${data.error}`, 400);
  }
  if (typeof data?.result !== "string") {
    throw new UpstreamError("JPL_INVALID_RESPONSE", "Horizons returned no result block.", 502);
  }

  return {
    target,
    center,
    rows: parseHorizonsResult(data.result),
    source: "NASA/JPL Horizons",
    requiresApiKey: false,
  };
}

// --------------------------------------------------------------------------
// Small-Body Identification
// --------------------------------------------------------------------------

export interface MovingObject {
  name: string;
  designation: string;
  ra: number;
  dec: number;
  offsetArcsec: number | null;
  apparentMagnitude: number | null;
  raRateArcsecPerHour: number | null;
  decRateArcsecPerHour: number | null;
  motionArcsecPerHour: number | null;
  positionUncertaintyArcsec: number | null;
  epochUtc: string;
  pass: "first" | "second";
  source: string;
}

export interface IdentifyRequest {
  ra: number;
  dec: number;
  halfWidthDeg: number;
  obsTime: string | Date;
  vmagLimit?: number;
  twoPass?: boolean;
  observer?: string;
}

export interface IdentifyResult {
  ra: number;
  dec: number;
  halfWidthDeg: number;
  epochUtc: string;
  vmagLimit: number;
  observer: string;
  pass: "first" | "second";
  count: number;
  objects: MovingObject[];
  source: string;
  requiresApiKey: false;
}

export const MAX_FIELD_HALF_WIDTH_DEG = 2.5;

export async function identifyMovingObjects(request: IdentifyRequest): Promise<IdentifyResult> {
  const { ra, dec, halfWidthDeg } = request;
  if (!(ra >= 0 && ra < 360) || !(dec >= -90 && dec <= 90)) {
    throw new UpstreamError("JPL_INVALID_QUERY", "Invalid field centre coordinates.", 400);
  }
  if (!(halfWidthDeg > 0 && halfWidthDeg <= MAX_FIELD_HALF_WIDTH_DEG)) {
    throw new UpstreamError(
      "JPL_INVALID_QUERY",
      `Field half-width must be within (0, ${MAX_FIELD_HALF_WIDTH_DEG}] degrees.`,
      400
    );
  }

  const when = toUtcDate(request.obsTime);
  const vmagLimit = request.vmagLimit ?? env.JPL_VMAG_LIMIT;
  const twoPass = request.twoPass ?? true;
  const observer = request.observer || env.JPL_OBSERVER_CODE;

  const params: Record<string, string> = {
    "mpc-code": observer,
    "obs-time": `${when.toISOString().slice(0, 10)}_${when.toISOString().slice(11, 19)}`,
    "fov-ra-center": formatRaSexagesimal(ra),
    "fov-dec-center": formatDecSexagesimal(dec),
    "fov-ra-hwidth": halfWidthDeg.toFixed(4),
    "fov-dec-hwidth": halfWidthDeg.toFixed(4),
    "mag-required": "true",
    "req-elem": "false",
    "two-pass": twoPass ? "true" : "false",
    // Mandatory in practice: without a magnitude ceiling the refinement pass
    // has to integrate hundreds of thousands of orbits and times out.
    "vmag-lim": vmagLimit.toFixed(2),
  };
  if (twoPass) params["suppress-first-pass"] = "true";

  const { data } = await fetchRemoteJson<any>(JPL_SB_IDENT_URL, params, {
    allowedHosts: JPL_HOSTS,
    timeoutMs: env.JPL_TIMEOUT_MS,
    label: "jpl-sbident",
    cacheTtlSeconds: env.JPL_CACHE_TTL_SECONDS,
  });

  const fields: string[] = data?.fields_second ?? data?.fields_first ?? [];
  const rows: string[][] = data?.data_second_pass ?? data?.data_first_pass ?? [];
  const pass: "first" | "second" = data?.data_second_pass ? "second" : "first";

  const cell = (row: string[], prefix: string): string | null => {
    const index = fields.findIndex((name) => String(name).startsWith(prefix));
    if (index < 0 || index >= row.length) return null;
    const value = row[index];
    return value === null || value === undefined || String(value).trim() === "" ? null : String(value);
  };

  // sb_ident reports a box of halfWidth per side; anything beyond its
  // circumscribed radius is a first-pass artefact rather than a real hit.
  const boundaryArcsec = halfWidthDeg * 3600 * Math.SQRT2;

  const objects: MovingObject[] = [];
  for (const row of rows) {
    const name = cell(row, "Object name");
    const raText = cell(row, "Astrometric RA");
    const decText = cell(row, "Astrometric Dec");
    if (!name || !raText || !decText) continue;

    let objectRa: number;
    let objectDec: number;
    try {
      objectRa = parseRaSexagesimal(raText);
      objectDec = parseDecSexagesimal(decText);
    } catch {
      continue;
    }

    const offset = numeric(cell(row, "Dist. from center Norm"));
    if (offset !== null && offset > boundaryArcsec) continue;

    const raRate = numeric(cell(row, "RA rate"));
    const decRate = numeric(cell(row, "Dec rate"));

    objects.push({
      name: name.trim(),
      designation: designationFromName(name),
      ra: objectRa,
      dec: objectDec,
      offsetArcsec: offset,
      apparentMagnitude: numeric(cell(row, "Visual magnitude")),
      raRateArcsecPerHour: raRate,
      decRateArcsecPerHour: decRate,
      motionArcsecPerHour: raRate !== null && decRate !== null ? Math.hypot(raRate, decRate) : null,
      positionUncertaintyArcsec: numeric(cell(row, "Est. error RA")),
      epochUtc: when.toISOString(),
      pass,
      source: "NASA/JPL Small-Body Identification",
    });
  }

  objects.sort((a, b) => (a.offsetArcsec ?? Infinity) - (b.offsetArcsec ?? Infinity));

  return {
    ra,
    dec,
    halfWidthDeg,
    epochUtc: when.toISOString(),
    vmagLimit,
    observer,
    pass,
    count: objects.length,
    objects,
    source: "NASA/JPL Small-Body Identification",
    requiresApiKey: false,
  };
}

// --------------------------------------------------------------------------
// api.nasa.gov NeoWs (JPL near-Earth-object data; needs NASA_API_KEY)
// --------------------------------------------------------------------------

export interface NearEarthObject {
  designation: string;
  name: string;
  neoReferenceId: string | null;
  absoluteMagnitudeH: number | null;
  estimatedDiameterKm: { min: number | null; max: number | null };
  potentiallyHazardous: boolean;
  sentryObject: boolean;
  closeApproaches: Array<{
    date: string | null;
    missDistanceAu: number | null;
    missDistanceLunar: number | null;
    relativeVelocityKmS: number | null;
    orbitingBody: string | null;
  }>;
  orbitClass: string | null;
  jplUrl: string | null;
  source: string;
}

/**
 * Translate an object number or SPK identifier into the identifier NeoWs uses.
 *
 * The two JPL services number the same body differently: the Small-Body
 * Database reports `20000433` for 433 Eros (20000000 + object number) while
 * NeoWs expects `2000433` (2000000 + object number). This accepts either form,
 * or a bare object number, and always returns the NeoWs form. The ranges are
 * unambiguous because minor-planet numbers are still well below 2,000,000.
 */
export function toNeowsIdentifier(value: string | number): string {
  const digits = String(value).trim();
  if (!/^\d{1,12}$/.test(digits)) {
    throw new UpstreamError(
      "NEOWS_INVALID_QUERY",
      "NeoWs expects a minor-planet number or SPK identifier, for example 433, 2000433 or 20000433 for 433 Eros.",
      400
    );
  }
  const numeric = Number(digits);
  if (numeric >= 20_000_000 && numeric < 30_000_000) {
    return String(2_000_000 + (numeric - 20_000_000)); // SBDB spkid -> NeoWs id
  }
  if (numeric >= 2_000_000 && numeric < 4_000_000) {
    return digits; // already a NeoWs identifier
  }
  if (numeric > 0 && numeric < 2_000_000) {
    return String(2_000_000 + numeric); // bare minor-planet number
  }
  return digits;
}

/**
 * Look up JPL near-Earth-object data through api.nasa.gov NeoWs.
 *
 * `identifier` may be a minor-planet number, a NeoWs identifier or the SPK
 * identifier the Small-Body Database reports. This is the one integration that
 * consumes NASA_API_KEY; the key is sent to api.nasa.gov and nowhere else.
 */
export async function getNearEarthObject(identifier: string): Promise<NearEarthObject> {
  const key = toNeowsIdentifier(identifier);
  if (!env.hasNasaApiKey) {
    throw new UpstreamError(
      "NASA_API_KEY_MISSING",
      "NASA_API_KEY is not configured, so api.nasa.gov NeoWs data is unavailable. " +
        "Set NASA_API_KEY in the repository-root .env file.",
      503
    );
  }

  const { data } = await fetchRemoteJson<any>(
    `${NASA_NEOWS_URL}/${encodeURIComponent(key)}`,
    { api_key: env.NASA_API_KEY },
    {
      allowedHosts: [NASA_API_HOST],
      timeoutMs: Math.min(env.JPL_TIMEOUT_MS, 60_000),
      label: "nasa-neows",
      cacheTtlSeconds: env.JPL_CACHE_TTL_SECONDS,
    }
  );

  if (!data?.name) {
    throw new UpstreamError("NEOWS_OBJECT_NOT_FOUND", `NeoWs has no object with identifier '${key}'.`, 404);
  }

  const diameter = data.estimated_diameter?.kilometers ?? {};

  return {
    designation: String(data.designation ?? key),
    name: String(data.name),
    neoReferenceId: data.neo_reference_id ? String(data.neo_reference_id) : null,
    absoluteMagnitudeH: numeric(data.absolute_magnitude_h),
    estimatedDiameterKm: {
      min: numeric(diameter.estimated_diameter_min),
      max: numeric(diameter.estimated_diameter_max),
    },
    potentiallyHazardous: Boolean(data.is_potentially_hazardous_asteroid),
    sentryObject: Boolean(data.is_sentry_object),
    closeApproaches: (data.close_approach_data ?? []).slice(0, 20).map((approach: any) => ({
      date: approach.close_approach_date_full ?? approach.close_approach_date ?? null,
      missDistanceAu: numeric(approach.miss_distance?.astronomical),
      missDistanceLunar: numeric(approach.miss_distance?.lunar),
      relativeVelocityKmS: numeric(approach.relative_velocity?.kilometers_per_second),
      orbitingBody: approach.orbiting_body ?? null,
    })),
    orbitClass: data.orbital_data?.orbit_class?.orbit_class_type ?? null,
    jplUrl: data.nasa_jpl_url ?? null,
    source: "NASA/JPL near-Earth-object data via api.nasa.gov NeoWs",
  };
}
