import { describe, it, expect } from "vitest";
import {
  buildCutoutUrl,
  describeCollections,
  detectorFromBandpass,
  isIrsaCollection,
  mjdToIso,
  normalizeProduct,
  searchSpherexProducts,
} from "../src/services/irsa.service.js";
import {
  angularSeparationArcsec,
  designationFromName,
  formatDecSexagesimal,
  formatRaSexagesimal,
  getNearEarthObject,
  identifyMovingObjects,
  parseDecSexagesimal,
  parseHorizonsResult,
  parseHorizonsTime,
  parseRaSexagesimal,
  toNeowsIdentifier,
} from "../src/services/jpl.service.js";
import { UpstreamError } from "../src/services/nasa-http.js";

/**
 * Offline unit tests for the NASA integrations: the parsing, normalisation and
 * guard-rail logic that sits between the archives and the rest of the platform.
 * Network behaviour is covered by nasa-live.test.ts.
 */

// One real row from the IRSA SIA2 ObsCore response for the Galactic centre.
const IRSA_ROW: Record<string, string> = {
  s_ra: "266.49199582120877",
  s_dec: "-28.324102637803755",
  facility_name: "SPHEREx",
  instrument_name: "SPHEREx",
  dataproduct_subtype: "science",
  calib_level: "2",
  dataproduct_type: "image",
  energy_bandpassname: "SPHEREx-D5",
  obs_id: "2026W39_1A_0289_1",
  s_resolution: "3.075000",
  em_min: "3.81130e-06",
  em_max: "4.43000e-06",
  em_res_power: "111.600000",
  access_url:
    "https://irsa.ipac.caltech.edu/ibe/data/spherex/qr3/level2/2026W39_1A/l2b-v27-2026-268/5/level2_2026W39_1A_0289_1D5_spx_l2b-v27-2026-268.fits",
  access_format: "image/fits",
  access_estsize: "57062",
  t_exptime: "113.582600",
  obs_collection: "spherex_qr3",
  obs_publisher_did: "ivo://irsa.ipac/spherex_qr3?2026W39_1A_0289_1/D5",
  s_xel1: "2040",
  s_xel2: "2040",
  s_pixel_scale: "6.150",
  t_min: "61305.288728",
  t_max: "61305.290060",
  obs_release_date: "2026-10-28 22:18:56",
};

describe("IRSA SIA2 normalisation", () => {
  it("accepts the collections the IRSA service actually publishes", () => {
    expect(isIrsaCollection("spherex_qr3")).toBe(true);
    expect(isIrsaCollection("spherex_dr1")).toBe(true);
    // IRSA retired the quick-release 2 collections.
    expect(isIrsaCollection("spherex_qr2")).toBe(false);
    expect(isIrsaCollection("not_a_collection")).toBe(false);
  });

  it("maps the ObsCore bandpass name onto a SPHEREx detector", () => {
    expect(detectorFromBandpass("SPHEREx-D5")).toBe(5);
    expect(detectorFromBandpass("SPHEREx-D1")).toBe(1);
    expect(detectorFromBandpass("SPHEREx-D6")).toBe(6);
    // Out of range or unknown falls back to detector 1 rather than throwing.
    expect(detectorFromBandpass("SPHEREx-D9")).toBe(1);
    expect(detectorFromBandpass(null)).toBe(1);
  });

  it("converts Modified Julian Dates to UTC", () => {
    // MJD 51544.5 is 2000-01-01T12:00:00Z, the J2000.0 epoch.
    expect(mjdToIso(51544.5)).toBe("2000-01-01T12:00:00.000Z");
    expect(mjdToIso(40587)).toBe("1970-01-01T00:00:00.000Z");
    expect(mjdToIso(null)).toBeNull();
    expect(mjdToIso(0)).toBeNull();
  });

  it("projects a real ObsCore row onto the platform schema", () => {
    const product = normalizeProduct(IRSA_ROW, "spherex_qr3");
    expect(product).not.toBeNull();
    expect(product!.archiveId).toBe("2026W39_1A_0289_1-D5");
    expect(product!.detector).toBe(5);
    expect(product!.bandNumber).toBe(5);
    // ObsCore spectral bounds are metres; the platform stores micrometres.
    expect(product!.wavelengthMinUm).toBeCloseTo(3.8113, 4);
    expect(product!.wavelengthMaxUm).toBeCloseTo(4.43, 4);
    // Cross-checked against astropy: Time(61305.288728, format="mjd").utc.isot
    expect(product!.observationDate).toBe("2026-09-22T06:55:46.099Z");
    expect(product!.ra).toBeCloseTo(266.491996, 5);
    expect(product!.width).toBe(2040);
    expect(product!.pixelScaleArcsec).toBeCloseTo(6.15, 2);
    expect(product!.accessUrl.startsWith("https://irsa.ipac.caltech.edu/")).toBe(true);
  });

  it("rejects rows whose access URL is not on the IRSA host", () => {
    expect(normalizeProduct({ ...IRSA_ROW, access_url: "https://example.com/x.fits" }, "spherex_qr3")).toBeNull();
    expect(normalizeProduct({ ...IRSA_ROW, access_url: "http://irsa.ipac.caltech.edu/x.fits" }, "spherex_qr3")).toBeNull();
    expect(normalizeProduct({ ...IRSA_ROW, access_url: "" }, "spherex_qr3")).toBeNull();
  });

  it("drops rows without a usable epoch", () => {
    expect(normalizeProduct({ ...IRSA_ROW, t_min: "" }, "spherex_qr3")).toBeNull();
  });

  it("builds bounded IBE cutout URLs and refuses foreign hosts", () => {
    const url = new URL(buildCutoutUrl(IRSA_ROW.access_url, 266.4, -29, 0.05));
    expect(url.hostname).toBe("irsa.ipac.caltech.edu");
    expect(url.searchParams.get("center")).toBe("266.400000,-29.000000");
    expect(url.searchParams.get("size")).toBe("0.050000");

    expect(() => buildCutoutUrl("https://evil.example.com/a.fits", 10, 10, 0.05)).toThrow(UpstreamError);
    expect(() => buildCutoutUrl(IRSA_ROW.access_url, 10, 10, 5)).toThrow(UpstreamError);
    expect(() => buildCutoutUrl(IRSA_ROW.access_url, 400, 10, 0.05)).toThrow(UpstreamError);
  });

  it("rejects out-of-range search parameters before any network call", async () => {
    await expect(searchSpherexProducts({ ra: 400, dec: 0, radiusDeg: 0.1 })).rejects.toThrow(UpstreamError);
    await expect(searchSpherexProducts({ ra: 10, dec: -95, radiusDeg: 0.1 })).rejects.toThrow(UpstreamError);
    await expect(searchSpherexProducts({ ra: 10, dec: 0, radiusDeg: 2 })).rejects.toThrow(UpstreamError);
    await expect(
      searchSpherexProducts({ ra: 10, dec: 0, radiusDeg: 0.1, collection: "spherex_qr2" })
    ).rejects.toThrow(/Unknown SPHEREx collection/);
  });

  it("describes the collections without claiming a credential is needed", () => {
    const described = describeCollections();
    expect(described.requiresApiKey).toBe(false);
    expect(described.collections.map((item) => item.name)).toContain("spherex_qr3");
    expect(described.bandCount).toBe(6);
  });
});

describe("JPL coordinate formatting", () => {
  it("formats right ascension the way sb_ident expects", () => {
    expect(formatRaSexagesimal(266.4)).toBe("17-45-36.00");
    expect(formatRaSexagesimal(0)).toBe("00-00-00.00");
    expect(formatRaSexagesimal(180)).toBe("12-00-00.00");
  });

  it("formats declination with sb_ident's M-for-minus convention", () => {
    expect(formatDecSexagesimal(-29)).toBe("M29-00-00.0");
    expect(formatDecSexagesimal(27.128333)).toBe("27-07-42.0");
    expect(formatDecSexagesimal(0)).toBe("00-00-00.0");
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => formatRaSexagesimal(360)).toThrow(UpstreamError);
    expect(() => formatDecSexagesimal(-91)).toThrow(UpstreamError);
  });

  it("round-trips sexagesimal positions back to degrees", () => {
    expect(parseRaSexagesimal("17:45:36.00")).toBeCloseTo(266.4, 6);
    expect(parseDecSexagesimal("-29 00'00.0\"")).toBeCloseTo(-29, 6);
    expect(parseDecSexagesimal("M29-00-00.0")).toBeCloseTo(-29, 6);
    expect(parseDecSexagesimal("+12 30'00\"")).toBeCloseTo(12.5, 6);
    // The real shape sb_ident returns.
    expect(parseRaSexagesimal("17:45:54.26")).toBeCloseTo(266.476083, 5);
    expect(parseDecSexagesimal("-28 55'02.5\"")).toBeCloseTo(-28.917361, 5);
  });

  it("measures angular separation accurately at small angles", () => {
    expect(angularSeparationArcsec(10, 20, 10, 20)).toBeCloseTo(0, 9);
    // One arcsecond of declination.
    expect(angularSeparationArcsec(10, 20, 10, 20 + 1 / 3600)).toBeCloseTo(1, 6);
    // One arcsecond of RA at declination 60 is 0.5 arcsec on the sky.
    expect(angularSeparationArcsec(10, 60, 10 + 1 / 3600, 60)).toBeCloseTo(0.5, 4);
    expect(angularSeparationArcsec(0, 0, 180, 0)).toBeCloseTo(180 * 3600, 3);
  });

  it("reduces sb_ident object labels to lookup keys", () => {
    expect(designationFromName("69372 (1994 UA6)")).toBe("69372");
    expect(designationFromName("433 Eros (A898 PA)")).toBe("433");
    expect(designationFromName("(1927 LA)")).toBe("1927 LA");
    expect(designationFromName("  C/2019 Y4  ")).toBe("C/2019 Y4");
  });
});

describe("Horizons ephemeris parsing", () => {
  // Verbatim excerpt of a real Horizons CSV response for 2006 SG36.
  const HORIZONS_RESULT = [
    "*******************************************************************",
    " Date__(UT)__HR:MN:SC.fff, , , R.A.___(ICRF), DEC____(ICRF),  dRA*cosD, d(DEC)/dt,    APmag,  S-brt,                r,       rdot,             delta,     deldot,     S-O-T,/r,     S-T-O,",
    "*******************************************************************",
    "$$SOE",
    " 2026-Jan-01 00:00:00.000, , , 266.402384172, -29.073755771,  63.91766,  -5.73310,   20.698,  6.022,   2.763570691292, -0.8059963,  3.70456213236882, -6.3765749,   14.5042,/L,    5.1106,",
    " 2026-Jan-02 00:00:00.000, , , 266.838811234, -29.112344556,  64.10000,  -5.70000,   20.700,  6.023,   2.761000000000, -0.8000000,  3.70000000000000, -6.3000000,   14.0000,/L,    5.2000,",
    "$$EOE",
    "*******************************************************************",
  ].join("\n");

  it("parses the timestamp, position and rate columns", () => {
    const rows = parseHorizonsResult(HORIZONS_RESULT);
    expect(rows).toHaveLength(2);

    const [first] = rows;
    expect(first.timeUtc).toBe("2026-01-01T00:00:00.000Z");
    expect(first.raDeg).toBeCloseTo(266.402384172, 9);
    expect(first.decDeg).toBeCloseTo(-29.073755771, 9);
    expect(first.raRateArcsecPerHour).toBeCloseTo(63.91766, 5);
    expect(first.decRateArcsecPerHour).toBeCloseTo(-5.7331, 4);
    expect(first.motionArcsecPerHour).toBeCloseTo(Math.hypot(63.91766, -5.7331), 6);
    expect(first.apparentMagnitude).toBeCloseTo(20.698, 3);
    expect(first.observerDistanceAu).toBeCloseTo(3.70456213236882, 10);
    expect(first.heliocentricDistanceAu).toBeCloseTo(2.763570691292, 10);
    // The `/L` sub-column must not be mistaken for the solar elongation value.
    expect(first.solarElongationDeg).toBeCloseTo(14.5042, 4);
    expect(first.phaseAngleDeg).toBeCloseTo(5.1106, 4);
  });

  it("handles the header variant Horizons emits without EXTRA_PREC", () => {
    const plain = HORIZONS_RESULT
      .replace("R.A.___(ICRF), DEC____(ICRF)", "R.A._(ICRF), DEC_(ICRF)")
      .replace(/Date__\(UT\)__HR:MN:SC\.fff/, "Date__(UT)__HR:MN")
      .replace(/2026-Jan-0(\d) 00:00:00\.000/g, "2026-Jan-0$1 00:00");
    const rows = parseHorizonsResult(plain);
    expect(rows).toHaveLength(2);
    expect(rows[0].timeUtc).toBe("2026-01-01T00:00:00.000Z");
    expect(rows[0].raDeg).toBeCloseTo(266.402384172, 9);
  });

  it("reports an unresolved target rather than returning nothing", () => {
    expect(() => parseHorizonsResult("No matches found for '999999999'")).toThrow(/could not resolve/i);
    expect(() => parseHorizonsResult("some unrelated text")).toThrow(UpstreamError);
  });

  it("parses Horizons timestamps in both precisions", () => {
    expect(parseHorizonsTime("2026-Jan-01 00:00")).toBe("2026-01-01T00:00:00.000Z");
    expect(parseHorizonsTime("2026-Dec-31 23:59:59.500")).toBe("2026-12-31T23:59:59.500Z");
    expect(parseHorizonsTime("not a date")).toBeNull();
  });
});

describe("JPL request guards", () => {
  it("refuses identification fields larger than the service can refine", async () => {
    await expect(
      identifyMovingObjects({ ra: 10, dec: 10, halfWidthDeg: 10, obsTime: "2026-01-01T00:00:00Z" })
    ).rejects.toThrow(/half-width/i);
    await expect(
      identifyMovingObjects({ ra: 400, dec: 10, halfWidthDeg: 0.1, obsTime: "2026-01-01T00:00:00Z" })
    ).rejects.toThrow(/field centre/i);
    await expect(
      identifyMovingObjects({ ra: 10, dec: 10, halfWidthDeg: 0.1, obsTime: "not-a-date" })
    ).rejects.toThrow(/epoch/i);
  });

  it("refuses NeoWs identifiers that are not numeric", async () => {
    await expect(getNearEarthObject("433 Eros")).rejects.toThrow(/minor-planet number or SPK identifier/i);
  });

  it("reconciles the two JPL identifier conventions for NeoWs", () => {
    // SBDB reports 20000000 + number; NeoWs expects 2000000 + number.
    expect(toNeowsIdentifier("20000433")).toBe("2000433");
    expect(toNeowsIdentifier("433")).toBe("2000433");
    expect(toNeowsIdentifier("2000433")).toBe("2000433");
    expect(toNeowsIdentifier("20099942")).toBe("2099942");
    expect(toNeowsIdentifier(99942)).toBe("2099942");
    expect(() => toNeowsIdentifier("Eros")).toThrow(UpstreamError);
  });
});
