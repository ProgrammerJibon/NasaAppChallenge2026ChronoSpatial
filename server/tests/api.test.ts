import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { closePool } from "../src/db/connection.js";

describe("SPHEREx Sky Change Explorer API Endpoints", () => {
  afterAll(async () => {
    await closePool();
  });

  describe("GET /api/health", () => {
    it("returns 200 with standard success structure", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe("ok");
      expect(typeof res.body.data.uptime).toBe("number");
    });
  });

  describe("GET /api/bootstrap", () => {
    it("returns featured region, demo observations and comparison", async () => {
      const res = await request(app).get("/api/bootstrap");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.featuredRegion).toBeDefined();
      expect(res.body.data.featuredRegion.name).toContain("Andromeda");
      expect(Array.isArray(res.body.data.demoObservations)).toBe(true);
      expect(res.body.data.demoObservations.length).toBeGreaterThan(0);
      expect(res.body.data.demoComparisonId).toBeDefined();
      expect(res.body.data.serverStatus).toBe("healthy");
      expect(res.body.data.dataSource.archive).toBe("IRSA");
    });
  });

  describe("GET /api/regions", () => {
    it("lists all seeded sky regions", async () => {
      const res = await request(app).get("/api/regions");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(5);
    });

    it("retrieves a specific region by slug", async () => {
      const res = await request(app).get("/api/regions/m31");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.slug).toBe("m31");
    });

    it("returns 404 with standard error format for unknown region", async () => {
      const res = await request(app).get("/api/regions/nonexistent-region-slug");
      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("REGION_NOT_FOUND");
    });
  });

  describe("GET /api/observations", () => {
    it("lists observations with pagination", async () => {
      const res = await request(app).get("/api/observations?limit=5");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.observations.length).toBe(5);
      expect(res.body.data.total).toBeGreaterThanOrEqual(35);
    });

    it("retrieves observation by ID", async () => {
      const res = await request(app).get("/api/observations/obs-m31-epoch-a");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.id).toBe("obs-m31-epoch-a");
      expect(res.body.data.band_number).toBeDefined();
    });

    it("returns 404 for unknown observation ID", async () => {
      const res = await request(app).get("/api/observations/unknown-obs-id-999");
      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("OBSERVATION_NOT_FOUND");
    });
  });

  describe("POST /api/observations/search", () => {
    it("returns cached observations for Andromeda M31 coordinates", async () => {
      const res = await request(app)
        .post("/api/observations/search")
        .send({
          ra: 10.098,
          dec: 39.143,
          radiusDeg: 0.25,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe("cached");
      expect(Array.isArray(res.body.data.observations)).toBe(true);
      expect(res.body.data.observations.length).toBeGreaterThan(0);
    });

    it("validates coordinates and rejects invalid RA/Dec", async () => {
      const res = await request(app)
        .post("/api/observations/search")
        .send({
          ra: 450.0, // Invalid RA > 360
          dec: 39.143,
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("queues a job for unobserved coordinates", async () => {
      const res = await request(app)
        .post("/api/observations/search")
        .send({
          ra: 180.0,
          dec: 0.0,
          radiusDeg: 0.1,
        });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe("queued");
      expect(res.body.data.jobId).toBeDefined();

      // Check job status via GET /api/jobs/:id
      const jobRes = await request(app).get(`/api/jobs/${res.body.data.jobId}`);
      expect(jobRes.status).toBe(200);
      expect(jobRes.body.data.status).toBe("queued");
    });
  });

  describe("POST /api/comparisons", () => {
    it("rejects comparing an observation with itself", async () => {
      const res = await request(app)
        .post("/api/comparisons")
        .send({
          observationAId: "obs-m31-epoch-a",
          observationBId: "obs-m31-epoch-a",
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("COMPARISON_FAILED");
    });

    it("returns existing completed comparison for m31 epochs", async () => {
      const res = await request(app)
        .post("/api/comparisons")
        .send({
          observationAId: "obs-m31-epoch-a",
          observationBId: "obs-m31-epoch-b",
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe("completed");
      expect(res.body.data.comparison.id).toBe("91e2fa3a-bab1-5ddf-bcef-2d42c98c9822");
    });
  });

  describe("GET /api/comparisons/:id", () => {
    it("retrieves comparison details with candidates", async () => {
      const res = await request(app).get(
        "/api/comparisons/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822"
      );
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.id).toBe("91e2fa3a-bab1-5ddf-bcef-2d42c98c9822");
      expect(res.body.data.candidates.length).toBeGreaterThanOrEqual(1);
    });

    it("returns 404 for unknown comparison ID", async () => {
      const res = await request(app).get("/api/comparisons/nonexistent-comp");
      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("COMPARISON_NOT_FOUND");
    });
  });

  describe("Files route path safety", () => {
    it("serves real preview image with correct headers", async () => {
      const res = await request(app).get("/api/files/preview/obs-m31-epoch-a");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/image\/(webp|png)/);
      expect(res.headers["cache-control"]).toContain("max-age=86400");
    });

    it("serves comparison difference image", async () => {
      const res = await request(app).get(
        "/api/files/comparison/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822/difference"
      );
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/image\/(webp|png)/);
    });

    it("rejects invalid comparison kind", async () => {
      const res = await request(app).get(
        "/api/files/comparison/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822/invalid-kind"
      );
      expect(res.status).toBe(404);
      expect(res.body.ok).toBe(false);
    });
  });

  describe("Citizen Science Review endpoints", () => {
    it("GET /api/review/next returns next item for inspection", async () => {
      const res = await request(app).get("/api/review/next");
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.comparisonId).toBeDefined();
    });

    it("POST /api/reviews submits a valid classification", async () => {
      const res = await request(app)
        .post("/api/reviews")
        .send({
          comparisonId: "91e2fa3a-bab1-5ddf-bcef-2d42c98c9822",
          candidateId: "cand-m31-01",
          visitorHash: "test-visitor-12345",
          classification: "Moving object",
          confidence: 0.9,
        });

      expect(res.status).toBe(201);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.reviewId).toBeDefined();
    });

    it("POST /api/reviews rejects invalid classification string", async () => {
      const res = await request(app)
        .post("/api/reviews")
        .send({
          comparisonId: "91e2fa3a-bab1-5ddf-bcef-2d42c98c9822",
          visitorHash: "test-visitor-12345",
          classification: "Supernova Explosion UFO", // invalid classification
        });

      expect(res.status).toBe(400);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("GET /api/reviews/stats/:comparisonId returns stats", async () => {
      const res = await request(app).get(
        "/api/reviews/stats/91e2fa3a-bab1-5ddf-bcef-2d42c98c9822"
      );
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(typeof res.body.data.totalReviews).toBe("number");
      expect(res.body.data.totalReviews).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Admin operations & security", () => {
    it("rejects unauthorized access to /api/admin/status", async () => {
      const res = await request(app).get("/api/admin/status");
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("rejects login with wrong password", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ password: "wrong-password" });
      expect(res.status).toBe(401);
      expect(res.body.ok).toBe(false);
      expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    });

    it("allows login with correct password and grants token", async () => {
      const res = await request(app)
        .post("/api/admin/login")
        .send({ password: "spherex_admin_secret_2025" });
      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.token).toBeDefined();

      const adminToken = res.body.data.token;

      // Access status with token
      const statusRes = await request(app)
        .get("/api/admin/status")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(statusRes.status).toBe(200);
      expect(statusRes.body.data.apiHealth).toBe("online");
      expect(statusRes.body.data.metrics.totalObservations).toBeGreaterThanOrEqual(35);

      // Access storage with token
      const storageRes = await request(app)
        .get("/api/admin/storage")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(storageRes.status).toBe(200);
      expect(storageRes.body.data.directories.fits).toBeDefined();

      // Logout
      const logoutRes = await request(app)
        .post("/api/admin/logout")
        .set("Authorization", `Bearer ${adminToken}`);
      expect(logoutRes.status).toBe(200);
    });
  });
});
