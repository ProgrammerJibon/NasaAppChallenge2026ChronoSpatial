import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api, ApiError } from "../lib/api";
import { API_BASE_URL } from "../lib/constants";

describe("Frontend API Client", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("constructs preview file URLs correctly", () => {
    const url = api.getPreviewUrl("obs-test-123");
    expect(url).toBe(`${API_BASE_URL}/files/preview/obs-test-123`);
  });

  it("constructs comparison file URLs correctly", () => {
    const diffUrl = api.getComparisonFileUrl("comp-456", "difference");
    expect(diffUrl).toBe(`${API_BASE_URL}/files/comparison/comp-456/difference`);

    const sigUrl = api.getComparisonFileUrl("comp-456", "significance");
    expect(sigUrl).toBe(`${API_BASE_URL}/files/comparison/comp-456/significance`);
  });

  it("handles successful API responses", async () => {
    const mockData = [{ id: "reg-1", name: "Andromeda M31" }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: mockData }),
    });

    const res = await api.getRegions();
    expect(res).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith(
      `${API_BASE_URL}/regions`,
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "application/json" }),
      })
    );
  });

  it("throws typed ApiError when server returns an error payload", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        ok: false,
        error: { code: "NOT_FOUND", message: "Observation not found" },
      }),
    });

    await expect(api.getObservation("missing-id")).rejects.toThrowError(ApiError);
  });

  it("throws typed ApiError when network fails completely", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network failed"));

    await expect(api.getRegions()).rejects.toThrowError(
      /Unable to connect to SPHEREx API server/
    );
  });
});
