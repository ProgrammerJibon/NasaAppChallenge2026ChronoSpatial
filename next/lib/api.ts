import { API_BASE_URL } from "./constants";
import type {
  BootstrapData,
  SkyRegion,
  Observation,
  Comparison,
  ProcessingJob,
  ReviewItem,
  ReviewStats,
} from "./types";

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: unknown;

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface ApiResponse<T> {
  ok: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new ApiError(
      "NETWORK_ERROR",
      `Unable to connect to SPHEREx API server at ${API_BASE_URL}. Ensure the backend is running.`,
      0,
      networkErr
    );
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError(
      "INVALID_RESPONSE",
      `Server returned status ${res.status} with non-JSON response.`,
      res.status
    );
  }

  if (!json.ok || !res.ok) {
    const err = json.error || {
      code: "API_ERROR",
      message: `Request failed with status ${res.status}`,
    };
    throw new ApiError(err.code, err.message, res.status, err.details);
  }

  return json.data as T;
}

// Public API endpoints
export const api = {
  getBootstrap: () => request<BootstrapData>("/bootstrap"),

  getRegions: () => request<SkyRegion[]>("/regions"),
  getRegion: (slug: string) => request<SkyRegion>(`/regions/${slug}`),

  searchObservations: (params: { ra: number; dec: number; radiusDeg?: number; band?: number | null }) =>
    request<{ status: "cached" | "queued"; observations?: Observation[]; jobId?: string }>(
      "/observations/search",
      { method: "POST", body: JSON.stringify(params) }
    ),

  listObservations: (query?: { regionId?: string; band?: number; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (query?.regionId) sp.set("regionId", query.regionId);
    if (query?.band !== undefined) sp.set("band", String(query.band));
    if (query?.limit !== undefined) sp.set("limit", String(query.limit));
    if (query?.offset !== undefined) sp.set("offset", String(query.offset));
    return request<{ observations: Observation[]; total: number }>(`/observations?${sp.toString()}`);
  },

  getObservation: (id: string) => request<Observation>(`/observations/${id}`),

  getJob: (id: string) => request<ProcessingJob>(`/jobs/${id}`),

  createComparison: (observationAId: string, observationBId: string) =>
    request<{ status: "completed" | "queued"; comparison?: Comparison; jobId?: string; comparisonId?: string }>(
      "/comparisons",
      { method: "POST", body: JSON.stringify({ observationAId, observationBId }) }
    ),

  getComparison: (id: string) => request<Comparison>(`/comparisons/${id}`),

  getNextReview: (visitorId?: string) =>
    request<ReviewItem>("/review/next", {
      headers: visitorId ? { "x-visitor-id": visitorId } : {},
    }),

  submitReview: (payload: {
    comparisonId: string;
    candidateId?: string | null;
    visitorHash: string;
    classification: string;
    confidence: number;
  }) =>
    request<{ reviewId: string; status: string }>("/reviews", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getReviewStats: (comparisonId: string) =>
    request<ReviewStats>(`/reviews/stats/${comparisonId}`),

  // File URL generators
  getPreviewUrl: (observationId: string) =>
    `${API_BASE_URL}/files/preview/${observationId}`,

  getComparisonFileUrl: (comparisonId: string, kind: "aligned-a" | "aligned-b" | "difference" | "significance") =>
    `${API_BASE_URL}/files/comparison/${comparisonId}/${kind}`,

  // Admin API endpoints
  adminLogin: (password: string) =>
    request<{ token: string; expiresAt: string }>("/admin/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    }),

  adminLogout: (token: string) =>
    request<{ message: string }>("/admin/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminGetStatus: (token: string) =>
    request<any>("/admin/status", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminGetJobs: (token: string, query?: { limit?: number; offset?: number; status?: string }) => {
    const sp = new URLSearchParams();
    if (query?.limit) sp.set("limit", String(query.limit));
    if (query?.offset) sp.set("offset", String(query.offset));
    if (query?.status) sp.set("status", query.status);
    return request<{ jobs: ProcessingJob[]; total: number }>(`/admin/jobs?${sp.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  adminRetryJob: (token: string, id: string) =>
    request<{ id: string; status: string }>(`/admin/jobs/${id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminCancelJob: (token: string, id: string) =>
    request<{ id: string; status: string }>(`/admin/jobs/${id}/cancel`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminGetStorage: (token: string) =>
    request<any>("/admin/storage", {
      headers: { Authorization: `Bearer ${token}` },
    }),

  adminCleanCache: (token: string) =>
    request<any>("/admin/cache/cleanup", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }),
};
