import path from "node:path";
import fs from "node:fs/promises";
import { env } from "../config/env.js";
import { getObservationById } from "./observation.service.js";
import { getComparisonById } from "./comparison.service.js";
import { COMPARISON_KINDS, type ComparisonKind } from "../config/constants.js";
import { logger } from "../utils/logger.js";

export async function getPreviewFilePath(
  observationId: string
): Promise<string | null> {
  const obs = await getObservationById(observationId);
  if (!obs || !obs.preview_path) {
    return null;
  }

  // Sanitize path to prevent directory traversal
  const sanitized = path.normalize(obs.preview_path).replace(/^(\.\.[\/\\])+/, "");
  
  // Try relative to storage first
  const fullPath = path.resolve(env.resolvedStoragePath, sanitized);
  
  // Ensure the resolved path is within storage directory
  if (!fullPath.startsWith(env.resolvedStoragePath)) {
    logger.warn(`Security check: path outside storage attempted: ${fullPath}`);
    return null;
  }

  try {
    await fs.access(fullPath);
    return fullPath;
  } catch {
    // Also try looking directly in storage/demo/previews/
    const demoPath = path.resolve(
      env.resolvedStoragePath,
      "demo",
      "previews",
      path.basename(sanitized)
    );
    try {
      await fs.access(demoPath);
      return demoPath;
    } catch {
      return null;
    }
  }
}

export async function getComparisonFilePath(
  comparisonId: string,
  kind: ComparisonKind
): Promise<string | null> {
  if (!COMPARISON_KINDS.includes(kind)) {
    return null;
  }

  const comp = await getComparisonById(comparisonId);
  if (!comp) return null;

  let relPath: string | null = null;
  switch (kind) {
    case "aligned-a":
      relPath = comp.aligned_a_path;
      break;
    case "aligned-b":
      relPath = comp.aligned_b_path;
      break;
    case "difference":
      relPath = comp.difference_path;
      break;
    case "significance":
      relPath = comp.significance_path;
      break;
  }

  if (!relPath) return null;

  const sanitized = path.normalize(relPath).replace(/^(\.\.[\/\\])+/, "");
  const fullPath = path.resolve(env.resolvedStoragePath, sanitized);

  if (!fullPath.startsWith(env.resolvedStoragePath)) {
    logger.warn(`Security check: path outside storage attempted: ${fullPath}`);
    return null;
  }

  try {
    await fs.access(fullPath);
    return fullPath;
  } catch {
    // Try demo fallback
    const demoPath = path.resolve(
      env.resolvedStoragePath,
      "demo",
      "comparisons",
      path.basename(sanitized)
    );
    try {
      await fs.access(demoPath);
      return demoPath;
    } catch {
      return null;
    }
  }
}
