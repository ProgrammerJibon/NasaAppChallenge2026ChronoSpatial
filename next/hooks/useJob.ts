"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { ProcessingJob } from "@/lib/types";

interface UseJobResult {
  job: ProcessingJob | null;
  loading: boolean;
  error: string | null;
  isCompleted: boolean;
  isFailed: boolean;
  retry: () => void;
}

export function useJob(jobId: string | null | undefined, pollIntervalMs = 2000): UseJobResult {
  const [job, setJob] = useState<ProcessingJob | null>(null);
  const [loading, setLoading] = useState(Boolean(jobId));
  const [error, setError] = useState<string | null>(null);

  const pollCountRef = useRef(0);
  const maxPolls = 150; // max ~5 minutes
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const data = await api.getJob(jobId);
      setJob(data);

      if (data.status === "completed" || data.status === "failed" || data.status === "cancelled") {
        setLoading(false);
        if (data.status === "failed") {
          setError(data.error || "Job processing failed.");
        }
        return; // STOP POLLING
      }

      pollCountRef.current += 1;
      if (pollCountRef.current > maxPolls) {
        setLoading(false);
        setError("Job polling timed out. Please check again later.");
        return;
      }

      timerRef.current = setTimeout(fetchStatus, pollIntervalMs);
    } catch (err: any) {
      setLoading(false);
      setError(err instanceof ApiError ? err.message : "Failed to check job progress.");
    }
  }, [jobId, pollIntervalMs]);

  useEffect(() => {
    pollCountRef.current = 0;
    setError(null);

    if (jobId) {
      setLoading(true);
      fetchStatus();
    } else {
      setJob(null);
      setLoading(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [jobId, fetchStatus]);

  const retry = useCallback(() => {
    pollCountRef.current = 0;
    setError(null);
    setLoading(true);
    fetchStatus();
  }, [fetchStatus]);

  return {
    job,
    loading,
    error,
    isCompleted: job?.status === "completed",
    isFailed: job?.status === "failed" || job?.status === "cancelled",
    retry,
  };
}
