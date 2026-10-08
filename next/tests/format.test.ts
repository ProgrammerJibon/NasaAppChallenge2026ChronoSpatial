import { describe, it, expect } from "vitest";
import { formatDate, formatShortDate, formatCoords, formatWavelength } from "../lib/format";

describe("Formatting Utilities", () => {
  it("formats dates gracefully", () => {
    const formatted = formatDate("2025-07-15T12:00:00Z");
    expect(formatted).toContain("2025");
    expect(formatted).toContain("Jul");

    expect(formatDate(null)).toBe("Unknown Date");
    expect(formatDate(undefined)).toBe("Unknown Date");
  });

  it("formats short dates gracefully", () => {
    const formatted = formatShortDate("2026-03-20T10:00:00Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Mar");

    expect(formatShortDate(null)).toBe("Unknown");
  });

  it("formats RA and Dec coordinates with sign and precision", () => {
    const positive = formatCoords(180.123456, 45.67891);
    expect(positive).toBe("RA 180.1235° / Dec +45.6789°");

    const negative = formatCoords(12.34, -8.765);
    expect(negative).toBe("RA 12.3400° / Dec -8.7650°");
  });

  it("formats wavelength intervals in micrometers", () => {
    const res = formatWavelength(1.234, 1.876);
    expect(res).toBe("1.23 – 1.88 µm");
  });
});
