import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { closePool } from "../src/db/connection.js";
import { searchSpherexProducts } from "../src/services/irsa.service.js";
import {
  angularSeparationArcsec,
  getHorizonsEphemeris,
  getNearEarthObject,
  getSmallBody,
  identifyMovingObjects,
} from "../src/services/jpl.service.js";
import { env } from "../src/config/env.js";

/**
 * Live integration tests against the real NASA services.
 *
 * These confirm that the request shapes the platform sends are the ones the
 * archives accept, and that the values coming back are scientifically sound —
 * most importantly that the Small-Body Identification service and Horizons
 * agree on where a body was at a given instant.
 *
 * Set SKIP_LIVE_NASA_TESTS=1 to skip them when running without network access.
 * Responses are cached under storage/cache, so repeat runs are fast.
 */

const live = process.env.SKIP_LIVE_NASA_TESTS === "1" ? describe.skip : describe;

// A Galactic-centre field with dense SPHEREx coverage and known minor planets.
const FIELD = { ra: 266.4, dec: -29.0 };
const EPOCH = "2026-01-01T00:00:00Z";

live("NASA/IPAC IRSA live archive", () => {
  it("discovers real SPHEREx products through SIA2", { timeout: 180_000 }, async () => {
    const result = await searchSpherexProducts({
      ra: FIELD.ra,
      dec: FIELD.dec,
      radiusDeg: 0.05,
      limit: 25,
    });

    expect(result.collection).toBe(env.IRSA_COLLECTION);
    expect(result.totalMatched).toBeGreaterThan(0);
    expect(result.products.length).toBeGreaterThan(0);
    expect(result.source.archive).toBe("NASA/IPAC IRSA");

    for (const product of result.products) {
      expect(product.accessUrl.startsWith("https://irsa.ipac.caltech.edu/")).toBe(true);
      expect(product.bandNumber).toBeGreaterThanOrEqual(1);
      expect(product.bandNumber).toBeLessThanOrEqual(6);
      // SPHEREx covers 0.75-5.0 micrometres across its six detectors.
      expect(product.wavelengthMinUm!).toBeGreaterThan(0.6);
      expect(product.wavelengthMaxUm!).toBeLessThan(5.5);
      expect(product.wavelengthMaxUm!).toBeGreaterThan(product.wavelengthMinUm!);
      // Every product must actually cover the queried position.
      expect(angularSeparationArcsec(FIELD.ra, FIELD.dec, product.ra!, product.dec!)).toBeLessThan(
        3.5 * 3600
      );
      expect(Date.parse(product.observationDate)).not.toBeNaN();
      expect(product.pixelScaleArcsec).toBeCloseTo(6.15, 1);
    }

    // Epochs must be ordered so the timeline and comparison views are coherent.
    const dates = result.products.map((product) => product.observationDate);
    expect([...dates].sort()).toEqual(dates);
  });

  it("filters by SPHEREx detector band", { timeout: 180_000 }, async () => {
    const result = await searchSpherexProducts({
      ra: FIELD.ra,
      dec: FIELD.dec,
      radiusDeg: 0.05,
      band: 3,
      limit: 10,
    });
    for (const product of result.products) {
      expect(product.bandNumber).toBe(3);
      expect(product.bandpass).toBe("SPHEREx-D3");
    }
  });

  it("returns an empty product set rather than failing off-survey", { timeout: 180_000 }, async () => {
    const result = await searchSpherexProducts({
      ra: FIELD.ra,
      dec: FIELD.dec,
      radiusDeg: 0.05,
      collection: "spherex_dr1_cube",
      limit: 5,
    });
    expect(Array.isArray(result.products)).toBe(true);
  });
});

live("NASA JPL live solar-system services", () => {
  it("returns orbital elements from the Small-Body Database", { timeout: 120_000 }, async () => {
    const body = await getSmallBody("433");
    expect(body.fullName).toContain("Eros");
    expect(body.orbitClass).toBe("Amor");
    expect(body.neo).toBe(true);
    // 433 Eros: a = 1.458 au, e = 0.2229, i = 10.83 deg.
    expect(body.elements.a.value!).toBeCloseTo(1.4582, 3);
    expect(body.elements.e.value!).toBeCloseTo(0.2229, 3);
    expect(body.elements.i.value!).toBeCloseTo(10.83, 1);
    expect(body.physicalParameters.H?.value).toBeCloseTo(10.4, 1);
    // SBDB numbers a minor planet as 20000000 + its number.
    expect(body.spkId).toBe("20000433");
  });

  it("reports a clear error for an unknown designation", { timeout: 120_000 }, async () => {
    await expect(getSmallBody("definitely-not-a-minor-planet")).rejects.toThrow();
  });

  it("produces a Horizons ephemeris at an explicit epoch", { timeout: 180_000 }, async () => {
    const result = await getHorizonsEphemeris({ target: "433", epochs: [EPOCH] });
    expect(result.rows).toHaveLength(1);
    const [row] = result.rows;
    expect(row.timeUtc).toBe("2026-01-01T00:00:00.000Z");
    expect(row.raDeg!).toBeGreaterThanOrEqual(0);
    expect(row.raDeg!).toBeLessThan(360);
    expect(Math.abs(row.decDeg!)).toBeLessThanOrEqual(90);
    // Eros stays inside roughly 1.1-1.8 au of the Sun.
    expect(row.heliocentricDistanceAu!).toBeGreaterThan(1.0);
    expect(row.heliocentricDistanceAu!).toBeLessThan(2.0);
    expect(row.motionArcsecPerHour!).toBeGreaterThan(0);
  });

  it("produces a stepped Horizons ephemeris whose motion is self-consistent", { timeout: 180_000 }, async () => {
    const result = await getHorizonsEphemeris({
      target: "433",
      start: "2026-01-01T00:00:00Z",
      stop: "2026-01-03T00:00:00Z",
      step: "1 d",
    });
    expect(result.rows.length).toBe(3);

    // The reported rates must reproduce the position change between steps.
    const [a, b] = result.rows;
    const measured = angularSeparationArcsec(a.raDeg!, a.decDeg!, b.raDeg!, b.decDeg!);
    const predicted = ((a.motionArcsecPerHour! + b.motionArcsecPerHour!) / 2) * 24;
    expect(measured).toBeGreaterThan(0);
    expect(Math.abs(measured - predicted) / measured).toBeLessThan(0.05);
  });

  it("identifies known minor planets in a field and agrees with Horizons", { timeout: 300_000 }, async () => {
    const result = await identifyMovingObjects({
      ra: FIELD.ra,
      dec: FIELD.dec,
      halfWidthDeg: 0.15,
      obsTime: EPOCH,
      vmagLimit: 22,
      twoPass: true,
    });

    expect(result.pass).toBe("second");
    expect(result.count).toBeGreaterThan(0);

    for (const object of result.objects) {
      expect(object.name.length).toBeGreaterThan(0);
      expect(object.ra).toBeGreaterThanOrEqual(0);
      expect(object.ra).toBeLessThan(360);
      expect(Math.abs(object.dec)).toBeLessThanOrEqual(90);
      expect(object.apparentMagnitude!).toBeLessThanOrEqual(22);
      // Everything returned must genuinely sit inside the requested box.
      expect(angularSeparationArcsec(FIELD.ra, FIELD.dec, object.ra, object.dec)).toBeLessThanOrEqual(
        0.15 * 3600 * Math.SQRT2 + 1
      );
    }

    // Scientific cross-validation: the position sb_ident reports for an object
    // must match the independent Horizons ephemeris for the same instant.
    const target = result.objects[0];
    const ephemeris = await getHorizonsEphemeris({ target: target.designation, epochs: [EPOCH] });
    const separation = angularSeparationArcsec(
      target.ra,
      target.dec,
      ephemeris.rows[0].raDeg!,
      ephemeris.rows[0].decDeg!
    );
    // Well inside one SPHEREx pixel (6.15 arcsec).
    expect(separation).toBeLessThan(2);

    // The apparent motion the two services report must agree too.
    expect(target.motionArcsecPerHour!).toBeCloseTo(ephemeris.rows[0].motionArcsecPerHour!, 0);
  });
});

live("api.nasa.gov NeoWs (uses NASA_API_KEY)", () => {
  it("looks up JPL near-Earth-object data for 433 Eros", { timeout: 120_000 }, async () => {
    if (!env.hasNasaApiKey) {
      await expect(getNearEarthObject("2000433")).rejects.toThrow(/NASA_API_KEY/);
      return;
    }
    // The SBDB identifier form must work as well as the NeoWs one.
    const neo = await getNearEarthObject("20000433");
    expect(neo.name).toContain("Eros");
    expect(neo.absoluteMagnitudeH).toBeCloseTo(10.4, 1);
    expect(neo.potentiallyHazardous).toBe(false);
    expect(neo.estimatedDiameterKm.max!).toBeGreaterThan(neo.estimatedDiameterKm.min!);
  });
});

live("HTTP routes over the live integrations", () => {
  it("serves the IRSA collection catalogue", async () => {
    const res = await request(app).get("/api/archive/collections");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.requiresApiKey).toBe(false);
    expect(res.body.data.collections.some((item: any) => item.name === "spherex_qr3")).toBe(true);
  });

  it("searches the live archive through the API", { timeout: 180_000 }, async () => {
    const res = await request(app)
      .post("/api/archive/search")
      .send({ ra: FIELD.ra, dec: FIELD.dec, radiusDeg: 0.03, limit: 5 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.products.length).toBeGreaterThan(0);
    expect(res.body.data.source.archive).toBe("NASA/IPAC IRSA");
  });

  it("identifies moving objects through the API", { timeout: 300_000 }, async () => {
    const res = await request(app)
      .post("/api/solar-system/identify")
      .send({ ra: FIELD.ra, dec: FIELD.dec, halfWidthDeg: 0.15, obsTime: EPOCH, vmagLimit: 22 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(Array.isArray(res.body.data.objects)).toBe(true);
    expect(res.body.data.source).toContain("JPL");
  });

  it("serves a Horizons ephemeris through the API", { timeout: 180_000 }, async () => {
    const res = await request(app).get("/api/solar-system/ephemeris").query({ target: "433", epoch: EPOCH });
    expect(res.status).toBe(200);
    expect(res.body.data.rows).toHaveLength(1);
    expect(res.body.data.source).toBe("NASA/JPL Horizons");
  });

  it("serves SBDB orbital elements through the API", { timeout: 120_000 }, async () => {
    const res = await request(app).get("/api/solar-system/objects/433");
    expect(res.status).toBe(200);
    expect(res.body.data.fullName).toContain("Eros");
  });

  it("rejects malformed requests before calling NASA", async () => {
    const badSearch = await request(app)
      .post("/api/archive/search")
      .send({ ra: 999, dec: 0, radiusDeg: 0.1 });
    expect(badSearch.status).toBe(400);
    expect(badSearch.body.error.code).toBe("VALIDATION_ERROR");

    const badIdentify = await request(app)
      .post("/api/solar-system/identify")
      .send({ ra: 10, dec: 10, halfWidthDeg: 99, obsTime: EPOCH });
    expect(badIdentify.status).toBe(400);

    const badEphemeris = await request(app).get("/api/solar-system/ephemeris").query({ target: "433" });
    expect(badEphemeris.status).toBe(400);

    const badNeo = await request(app).get("/api/solar-system/neo/not-a-number");
    expect(badNeo.status).toBe(400);
  });

  it("closes the database pool after the suite", async () => {
    await closePool();
    expect(true).toBe(true);
  });
});
