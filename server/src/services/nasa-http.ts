import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../config/env.js";
import { sha256 } from "../utils/hash.js";
import { logger } from "../utils/logger.js";

/**
 * Shared transport for the NASA archives the platform reads from.
 *
 * Every outbound request is pinned to an explicit host allowlist, bounded in
 * both time and response size, and cached on disk so repeated reads of the same
 * deterministic query do not hammer the archives. Credentials are stripped from
 * cache keys and from every log line.
 */

const SECRET_PARAMS = new Set(["api_key", "apikey", "token"]);
const DEFAULT_MAX_BYTES = 32 * 1024 * 1024;

export class UpstreamError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(code: string, message: string, statusCode = 502, details?: unknown) {
    super(message);
    this.name = "UpstreamError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export interface RemoteRequestOptions {
  /** Hosts this request is permitted to reach. */
  allowedHosts: readonly string[];
  /** Abort the request after this many milliseconds. */
  timeoutMs: number;
  /** Prefix for the on-disk cache entry; also used in log lines. */
  label: string;
  /** Seconds a cached response stays valid. Zero disables caching. */
  cacheTtlSeconds?: number;
  /** Reject bodies larger than this. */
  maxBytes?: number;
}

function assertAllowedHost(url: URL, allowedHosts: readonly string[]): void {
  if (url.protocol !== "https:" || url.username || url.password) {
    throw new UpstreamError(
      "UPSTREAM_URL_REJECTED",
      "Only plain HTTPS NASA archive URLs may be requested.",
      400
    );
  }
  if (!allowedHosts.includes(url.hostname)) {
    throw new UpstreamError(
      "UPSTREAM_HOST_REJECTED",
      `Host ${url.hostname} is not an approved NASA archive host.`,
      400
    );
  }
}

function buildUrl(base: string, params: Record<string, string | number | undefined>): URL {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }
  return url;
}

/** A stable cache key that never contains a credential. */
function cacheKeyFor(url: URL): string {
  const scrubbed = new URL(url.toString());
  for (const name of [...scrubbed.searchParams.keys()]) {
    if (SECRET_PARAMS.has(name.toLowerCase())) scrubbed.searchParams.delete(name);
  }
  scrubbed.searchParams.sort();
  return sha256(scrubbed.toString());
}

/** A log- and error-safe rendering of a request target. */
export function describeUrl(url: URL): string {
  const scrubbed = new URL(url.toString());
  for (const name of [...scrubbed.searchParams.keys()]) {
    if (SECRET_PARAMS.has(name.toLowerCase())) scrubbed.searchParams.set(name, "REDACTED");
  }
  return scrubbed.toString();
}

async function cachePath(label: string, key: string): Promise<string> {
  const directory = path.join(env.resolvedStoragePath, "cache");
  await fs.mkdir(directory, { recursive: true });
  return path.join(directory, `${label}-${key}.json`);
}

async function readCache<T>(file: string, ttlSeconds: number): Promise<T | null> {
  if (ttlSeconds <= 0) return null;
  try {
    const stats = await fs.stat(file);
    if ((Date.now() - stats.mtimeMs) / 1000 > ttlSeconds) return null;
    return JSON.parse(await fs.readFile(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

async function writeCache(file: string, payload: unknown): Promise<void> {
  try {
    await fs.writeFile(file, JSON.stringify(payload), "utf-8");
  } catch (error) {
    logger.warn(`Could not persist upstream cache entry ${path.basename(file)}:`, error);
  }
}

async function readBoundedBody(response: Response, maxBytes: number, target: string): Promise<string> {
  const declared = response.headers.get("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw new UpstreamError(
      "UPSTREAM_RESPONSE_TOO_LARGE",
      `${target} returned ${declared} bytes, above the configured limit. Narrow the query.`,
      502
    );
  }

  const body = await response.arrayBuffer();
  if (body.byteLength > maxBytes) {
    throw new UpstreamError(
      "UPSTREAM_RESPONSE_TOO_LARGE",
      `${target} returned ${body.byteLength} bytes, above the configured limit. Narrow the query.`,
      502
    );
  }
  return new TextDecoder("utf-8").decode(body);
}

/** GET a remote NASA endpoint and return the raw response body as text. */
export async function fetchRemoteText(
  base: string,
  params: Record<string, string | number | undefined>,
  options: RemoteRequestOptions
): Promise<{ body: string; contentType: string; fromCache: boolean }> {
  const url = buildUrl(base, params);
  assertAllowedHost(url, options.allowedHosts);

  const ttl = options.cacheTtlSeconds ?? 0;
  const file = await cachePath(options.label, cacheKeyFor(url));
  const cached = await readCache<{ body: string; contentType: string }>(file, ttl);
  if (cached) {
    return { ...cached, fromCache: true };
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(options.timeoutMs),
      headers: { Accept: "application/json, text/xml;q=0.9, */*;q=0.1" },
    });
  } catch (error: any) {
    const reason = error?.name === "TimeoutError" || error?.name === "AbortError"
      ? `timed out after ${options.timeoutMs} ms`
      : error?.message || "network failure";
    throw new UpstreamError(
      "UPSTREAM_UNREACHABLE",
      `${url.hostname} could not be reached (${reason}).`,
      504
    );
  }

  const contentType = response.headers.get("content-type") || "";
  const body = await readBoundedBody(response, options.maxBytes ?? DEFAULT_MAX_BYTES, url.hostname);

  if (!response.ok) {
    logger.warn(`${options.label}: ${url.hostname} responded ${response.status} for ${describeUrl(url)}`);
    throw new UpstreamError(
      "UPSTREAM_REQUEST_FAILED",
      `${url.hostname} rejected the request (HTTP ${response.status}): ${body.slice(0, 200).trim()}`,
      response.status >= 500 ? 502 : 400
    );
  }

  if (ttl > 0) await writeCache(file, { body, contentType });
  return { body, contentType, fromCache: false };
}

/** GET a remote NASA endpoint and parse the response as JSON. */
export async function fetchRemoteJson<T>(
  base: string,
  params: Record<string, string | number | undefined>,
  options: RemoteRequestOptions
): Promise<{ data: T; fromCache: boolean }> {
  const { body, fromCache } = await fetchRemoteText(base, params, options);
  try {
    return { data: JSON.parse(body) as T, fromCache };
  } catch {
    throw new UpstreamError(
      "UPSTREAM_INVALID_JSON",
      `${new URL(base).hostname} returned a non-JSON response: ${body.slice(0, 200).trim()}`,
      502
    );
  }
}
