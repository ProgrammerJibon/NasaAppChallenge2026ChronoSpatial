import { describe, expect, it } from "vitest";
import request from "supertest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createDemoFallbackApp } from "../src/demo-fallback.js";
import { env } from "../src/config/env.js";

describe("read-only local archive", () => {
  it("serves real observation records and their bundled preview when MySQL is offline", async () => {
    const app = await createDemoFallbackApp();
    expect(app).not.toBeNull();
    const regions = await request(app!).get("/api/regions");
    const observations = await request(app!).get("/api/observations?regionId=region-m31");
    expect(regions.body.data.some((region: { slug: string }) => region.slug === "m31")).toBe(true);
    expect(observations.body.data.observations.length).toBeGreaterThan(1);
    const id = observations.body.data.observations[0].id;
    const preview = await request(app!).get(`/api/files/preview/${id}`);
    expect(preview.status).toBe(200);
    expect(preview.headers["content-type"]).toMatch(/^image\/webp/);
  });

  it("does not claim to run new science jobs without the database", async () => {
    const app = await createDemoFallbackApp();
    const response = await request(app!).post("/api/comparisons").send({ observationAId: "missing-a", observationBId: "missing-b" });
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_OFFLINE");
  });

  it("allows a maintainer to inspect local archive status without exposing database-only jobs", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "spherex-admin-"));
    const app = await createDemoFallbackApp({ reviewDbPath: path.join(directory, "reviews.sqlite") });
    const unauthorized = await request(app!).get("/api/admin/status");
    expect(unauthorized.status).toBe(401);
    const incorrect = await request(app!).post("/api/admin/login").send({ password: "incorrect" });
    expect(incorrect.status).toBe(401);
    const login = await request(app!).post("/api/admin/login").send({ password: env.ADMIN_PASSWORD });
    expect(login.status).toBe(200);
    const authorization = `Bearer ${login.body.data.token}`;
    const privateOverview = await request(app!).get("/api/admin/overview");
    expect(privateOverview.status).toBe(401);
    const status = await request(app!).get("/api/admin/status").set("Authorization", authorization);
    expect(status.body.data.mode).toBe("local-archive");
    expect(status.body.data.metrics.totalObservations).toBeGreaterThan(0);
    const overview = await request(app!).get("/api/admin/overview").set("Authorization", authorization);
    expect(overview.status).toBe(200);
    expect(overview.body.data.archive.observations).toBe(status.body.data.metrics.totalObservations);
    expect(overview.body.data.archive.previews.available).toBeGreaterThan(0);
    expect(overview.body.data.reviews.observationReviews).toBe(0);
    const storage = await request(app!).get("/api/admin/storage").set("Authorization", authorization);
    expect(storage.status).toBe(200);
    const jobs = await request(app!).get("/api/admin/jobs").set("Authorization", authorization);
    expect(jobs.body.data).toEqual({ jobs: [], total: 0 });
    const logout = await request(app!).post("/api/admin/logout").set("Authorization", authorization);
    expect(logout.status).toBe(200);
    const expired = await request(app!).get("/api/admin/status").set("Authorization", authorization);
    expect(expired.status).toBe(401);
  });

  it("saves one editable review per visitor and observation in a durable local database", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "spherex-reviews-"));
    const reviewDbPath = path.join(directory, "reviews.sqlite");
    const app = await createDemoFallbackApp({ reviewDbPath });
    const observations = await request(app!).get("/api/observations?limit=1");
    const observationId = observations.body.data.observations[0].id;
    const visitorId = "test-visitor-12345";
    const review = { observationId, classification: "faint", confidence: .8, flags: ["noise"], note: "A faint source near the center." };
    const first = await request(app!).post("/api/observation-reviews").set("x-visitor-id", visitorId).send(review);
    expect(first.status).toBe(201);
    expect(first.body.data.classification).toBe("faint");
    const updated = await request(app!).post("/api/observation-reviews").set("x-visitor-id", visitorId).send({ ...review, classification: "uncertain" });
    expect(updated.status).toBe(201);
    expect(updated.body.data.id).toBe(first.body.data.id);
    const restartedApp = await createDemoFallbackApp({ reviewDbPath });
    const mine = await request(restartedApp!).get(`/api/observation-reviews/${observationId}/mine`).set("x-visitor-id", visitorId);
    const stats = await request(restartedApp!).get(`/api/observation-reviews/${observationId}/stats`);
    expect(mine.body.data.classification).toBe("uncertain");
    expect(stats.body.data).toEqual({ totalReviews: 1, classifications: { uncertain: 1 } });
    const login = await request(restartedApp!).post("/api/admin/login").send({ password: env.ADMIN_PASSWORD });
    const overview = await request(restartedApp!).get("/api/admin/overview")
      .set("Authorization", `Bearer ${login.body.data.token}`);
    expect(overview.body.data.reviews.observationReviews).toBe(1);
    const missing = await request(restartedApp!).post("/api/observation-reviews").set("x-visitor-id", visitorId).send({ ...review, observationId: "missing" });
    expect(missing.status).toBe(404);
  });
});
