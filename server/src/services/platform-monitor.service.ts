import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";

const pages = [
  { path: "/", label: "Home" },
  { path: "/explore", label: "Explore Sky" },
  { path: "/timeline", label: "Timeline" },
  { path: "/compare", label: "Compare Epochs" },
  { path: "/review", label: "Citizen Review" },
  { path: "/about", label: "About Mission" },
  { path: "/team", label: "Our Team" },
];

export async function checkPublicPages() {
  const origin = env.CORS_ORIGIN;
  const base = origin === "*" ? null : (() => {
    try {
      const url = new URL(origin);
      return ["http:", "https:"].includes(url.protocol) ? url : null;
    } catch { return null; }
  })();
  const results = await Promise.all(pages.map(async page => {
    if (!base) return { ...page, status: "unconfigured" as const, httpStatus: null, latencyMs: null };
    const started = performance.now();
    try {
      const response = await fetch(new URL(page.path, base), {
        method: "HEAD",
        signal: AbortSignal.timeout(4000),
      });
      return { ...page, status: response.ok ? "online" as const : "error" as const,
        httpStatus: response.status, latencyMs: Math.round(performance.now() - started) };
    } catch {
      return { ...page, status: "unreachable" as const, httpStatus: null,
        latencyMs: Math.round(performance.now() - started) };
    }
  }));
  const online = results.filter(page => page.status === "online").length;
  return {
    status: !base ? "unconfigured" : online === results.length ? "online" : online === 0 ? "offline" : "degraded",
    online,
    total: results.length,
    pages: results,
  };
}

export async function checkArchiveAssets(paths: Array<string | null | undefined>, kind: "previews" | "comparisons") {
  const present = await Promise.all(paths.map(async relativePath => {
    if (!relativePath) return false;
    const sanitized = path.normalize(relativePath).replace(/^(\.\.[\/\\])+/, "");
    const direct = path.resolve(env.resolvedStoragePath, sanitized);
    const root = `${env.resolvedStoragePath}${path.sep}`;
    const candidates = [
      ...(direct.startsWith(root) ? [direct] : []),
      path.join(env.resolvedStoragePath, "demo", kind, path.basename(sanitized)),
    ];
    for (const candidate of candidates) {
      try { await fs.access(candidate); return true; } catch { /* try next location */ }
    }
    return false;
  }));
  return { available: present.filter(Boolean).length, total: paths.length };
}
