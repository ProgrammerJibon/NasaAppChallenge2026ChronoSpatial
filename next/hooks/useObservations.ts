"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { Observation } from "@/lib/types";

export function useObservations(regionId?: string, band?: number) {
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchObservations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listObservations({
        regionId,
        band,
        limit: 100,
      });
      setObservations(res.observations);
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load observations.");
    } finally {
      setLoading(false);
    }
  }, [regionId, band]);

  useEffect(() => {
    fetchObservations();
  }, [fetchObservations]);

  return { observations, loading, error, refetch: fetchObservations };
}
