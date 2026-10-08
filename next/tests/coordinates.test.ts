import { describe, it, expect } from "vitest";
import { parseCoordinates } from "../lib/coordinates";

describe("Coordinates Parser", () => {
  it("resolves named astronomical targets correctly", () => {
    const m31 = parseCoordinates("M31");
    expect(m31.isValid).toBe(true);
    expect(m31.ra).toBeCloseTo(10.098, 2);
    expect(m31.dec).toBeCloseTo(39.143, 2);

    const orion = parseCoordinates("Orion");
    expect(orion.isValid).toBe(true);
    expect(orion.ra).toBeCloseTo(82.821, 2);
    expect(orion.dec).toBeCloseTo(-3.99, 2);

    const pleiades = parseCoordinates("pleiades");
    expect(pleiades.isValid).toBe(true);
    expect(pleiades.ra).toBeCloseTo(56.655, 2);
  });

  it("parses comma-separated decimal coordinates", () => {
    const res = parseCoordinates("180.5, 45.2");
    expect(res.isValid).toBe(true);
    expect(res.ra).toBe(180.5);
    expect(res.dec).toBe(45.2);
  });

  it("parses space-separated decimal coordinates", () => {
    const res = parseCoordinates("266.185 -28.153");
    expect(res.isValid).toBe(true);
    expect(res.ra).toBe(266.185);
    expect(res.dec).toBe(-28.153);
  });

  it("rejects out-of-range RA coordinates", () => {
    const res = parseCoordinates("365.0, 10.0");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Right Ascension");
  });

  it("rejects out-of-range Dec coordinates", () => {
    const res = parseCoordinates("10.0, -95.0");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Declination");
  });

  it("rejects empty or gibberish input", () => {
    const empty = parseCoordinates("");
    expect(empty.isValid).toBe(false);

    const gibberish = parseCoordinates("not-a-star-123456789xyz");
    expect(gibberish.isValid).toBe(false);
    expect(gibberish.error).toBeDefined();
  });
});
