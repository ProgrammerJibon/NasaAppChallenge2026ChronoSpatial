"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type { ProcessingJob } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { BeginnerExplainer } from "@/components/ui/BeginnerExplainer";
import {
  RiShieldCheckLine,
  RiLockPasswordLine,
  RiDashboardLine,
  RiServerLine,
  RiDatabase2Line,
  RiCpuLine,
  RiHardDriveLine,
  RiRefreshLine,
  RiDeleteBinLine,
  RiPlayListLine,
  RiCheckLine,
  RiCloseLine,
  RiAlertLine,
  RiLogoutBoxRLine,
  RiRestartLine,
  RiStopCircleLine,
} from "react-icons/ri";

interface SystemStatus {
  apiHealth: string;
  databaseHealth: string;
  workerStatus: string;
  metrics: {
    totalObservations: number;
    totalComparisons: number;
    totalCandidates: number;
    jobs: {
      queued: number;
      processing: number;
      completed: number;
      failed: number;
    };
  };
  uptimeSeconds: number;
}

interface StorageStatus {
  totalBytes: number;
  totalHuman: string;
  directories: Record<string, { bytes: number; human: string }>;
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Dashboard Data
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [storage, setStorage] = useState<StorageStatus | null>(null);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [jobFilter, setJobFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("spherex_admin_token");
      if (stored) {
        setToken(stored);
      }
    } catch {
      // sessionStorage might be restricted
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      const res = await api.adminLogin(password);
      setToken(res.token);
      try {
        sessionStorage.setItem("spherex_admin_token", res.token);
      } catch {
        // ignore
      }
      setPassword("");
    } catch (err: any) {
      setLoginError(err.message || "Invalid admin credentials");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await api.adminLogout(token);
      } catch {
        // ignore logout errors
      }
    }
    setToken(null);
    setStatus(null);
    setStorage(null);
    setJobs([]);
    try {
      sessionStorage.removeItem("spherex_admin_token");
    } catch {
      // ignore
    }
  };

  const fetchDashboardData = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const [statusRes, storageRes, jobsRes] = await Promise.all([
        api.adminGetStatus(token),
        api.adminGetStorage(token),
        api.adminGetJobs(token, {
          status: jobFilter === "all" ? undefined : jobFilter,
          limit: 50,
        }),
      ]);
      setStatus(statusRes);
      setStorage(storageRes);
      setJobs(jobsRes.jobs || []);
    } catch (err: any) {
      if (err instanceof ApiError && err.statusCode === 401) {
        setToken(null);
        try {
          sessionStorage.removeItem("spherex_admin_token");
        } catch {
          // ignore
        }
        setActionMessage({ type: "error", text: "Admin session expired. Please log in again." });
      } else {
        setActionMessage({ type: "error", text: err.message || "Failed to load dashboard data." });
      }
    } finally {
      setIsLoading(false);
    }
  }, [token, jobFilter]);

  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token, fetchDashboardData]);

  const handleRetryJob = async (jobId: string) => {
    if (!token) return;
    try {
      await api.adminRetryJob(token, jobId);
      setActionMessage({ type: "success", text: `Job ${jobId} re-queued successfully.` });
      fetchDashboardData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || `Failed to retry job ${jobId}.` });
    }
  };

  const handleCancelJob = async (jobId: string) => {
    if (!token) return;
    try {
      await api.adminCancelJob(token, jobId);
      setActionMessage({ type: "success", text: `Job ${jobId} cancelled.` });
      fetchDashboardData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || `Failed to cancel job ${jobId}.` });
    }
  };

  const handleCleanCache = async () => {
    if (!token) return;
    if (!confirm("Are you sure you want to clean temporary cache files?")) return;
    try {
      const res = await api.adminCleanCache(token);
      setActionMessage({
        type: "success",
        text: `Cache cleared! Removed ${res.deletedFiles} temporary files.`,
      });
      fetchDashboardData();
    } catch (err: any) {
      setActionMessage({ type: "error", text: err.message || "Failed to clean cache." });
    }
  };

  // If not authenticated, show login form
  if (!token) {
    return (
      <div className="max-w-md mx-auto py-16 px-4">
        <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-8 space-y-6 shadow-2xl backdrop-blur-sm">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mx-auto shadow-inner">
              <RiShieldCheckLine className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Console</h1>
            <p className="text-xs text-slate-400">
              Enter system passkey to manage database jobs, storage, and worker queues.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <RiLockPasswordLine className="w-4 h-4 text-cyan-400" />
                <span>Admin Password</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono transition"
                autoFocus
              />
            </div>

            {loginError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <RiAlertLine className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn || !password.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? "Authenticating..." : "Sign In to Admin"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-mono">
            <RiDashboardLine className="w-3.5 h-3.5" />
            <span>Operations & Monitoring</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            SPHEREx System Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono text-slate-300 hover:text-white transition disabled:opacity-50"
          >
            <RiRefreshLine className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/50 border border-rose-900/50 hover:bg-rose-900/50 text-xs font-mono text-rose-300 transition"
          >
            <RiLogoutBoxRLine className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Beginner Guide Explainer */}
      <BeginnerExplainer
        pageTitle="System Operations & Administration"
        pagePurpose="This dashboard lets administrators and scientists monitor server health, observe background Astropy reprojection tasks, manage the scientific processing queue, and monitor disk storage for FITS images and previews."
        items={[
          {
            icon: <RiServerLine className="w-4 h-4 text-cyan-400" />,
            term: "API Gateway & Database",
            definition: "Monitors the Node.js Express server uptime and connection status with the local MySQL 'spherex_atlas' database.",
          },
          {
            icon: <RiCpuLine className="w-4 h-4 text-purple-400" />,
            term: "Science Worker Daemon",
            definition: "Tracks whether the Python background worker is actively crunching Astropy WCS reprojections and difference images.",
          },
          {
            icon: <RiPlayListLine className="w-4 h-4 text-amber-400" />,
            term: "Processing Queue",
            definition: "Shows background tasks for comparing epochs and searching IRSA. You can cancel active tasks or retry failed tasks.",
          },
          {
            icon: <RiHardDriveLine className="w-4 h-4 text-emerald-400" />,
            term: "Disk Storage & Cache",
            definition: "Measures disk space used by raw FITS files and preview WebPs. Use 'Clean Cache' to purge temporary working files.",
          },
        ]}
      />

      {/* Action Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            actionMessage.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-rose-950/40 border-rose-800/60 text-rose-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <RiCheckLine className="w-4 h-4 text-emerald-400" />
            ) : (
              <RiAlertLine className="w-4 h-4 text-rose-400" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-slate-400 hover:text-white"
          >
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Health & Metrics Cards */}
      {status && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>API Gateway</span>
              <RiServerLine className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-lg font-bold text-white capitalize">{status.apiHealth}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Uptime: {Math.floor(status.uptimeSeconds / 60)}m {status.uptimeSeconds % 60}s
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>MySQL Database</span>
              <RiDatabase2Line className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  status.databaseHealth === "connected" ? "bg-emerald-400" : "bg-rose-400"
                }`}
              />
              <span className="text-lg font-bold text-white capitalize">{status.databaseHealth}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {status.metrics.totalObservations} Obs · {status.metrics.totalComparisons} Comp
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Science Worker</span>
              <RiCpuLine className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-2">
              <div
                className={`w-2.5 h-2.5 rounded-full ${
                  status.workerStatus === "active"
                    ? "bg-emerald-400 animate-pulse"
                    : status.workerStatus === "idle"
                    ? "bg-amber-400"
                    : "bg-slate-500"
                }`}
              />
              <span className="text-lg font-bold text-white capitalize">{status.workerStatus}</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              Astropy & SciPy engine
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-mono">
              <span>Job Queue</span>
              <RiPlayListLine className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-center gap-3 text-sm font-mono">
              <span className="text-amber-400 font-bold">{status.metrics.jobs.queued} Q</span>
              <span className="text-cyan-400 font-bold">{status.metrics.jobs.processing} P</span>
              <span className="text-emerald-400 font-bold">{status.metrics.jobs.completed} C</span>
              <span className="text-rose-400 font-bold">{status.metrics.jobs.failed} F</span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              {status.metrics.totalCandidates} Candidates detected
            </p>
          </div>
        </div>
      )}

      {/* Storage Disk Breakdown */}
      {storage && (
        <section className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <RiHardDriveLine className="w-4 h-4 text-cyan-400" />
              <span>Storage & Asset Volume ({storage.totalHuman} Total)</span>
            </div>
            <button
              onClick={handleCleanCache}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-slate-200 transition"
            >
              <RiDeleteBinLine className="w-3.5 h-3.5 text-amber-400" />
              <span>Clean Cache Dir</span>
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {Object.entries(storage.directories).map(([folder, data]) => (
              <div
                key={folder}
                className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1"
              >
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  {folder}
                </div>
                <div className="text-sm font-bold text-white font-mono">{data.human}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Processing Jobs Table */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <RiPlayListLine className="w-4 h-4 text-cyan-400" />
            <h2 className="text-lg font-bold text-white tracking-tight">Processing Queue</h2>
            <span className="text-xs font-mono text-slate-400">({jobs.length} jobs)</span>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-mono">
            {["all", "queued", "processing", "completed", "failed"].map((f) => (
              <button
                key={f}
                onClick={() => setJobFilter(f)}
                className={`px-2.5 py-1 rounded-lg capitalize transition ${
                  jobFilter === f
                    ? "bg-cyan-600 text-white font-bold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {jobs.length === 0 ? (
          <div className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500 font-mono">
            No processing jobs found with status &ldquo;{jobFilter}&rdquo;.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Job ID</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Progress</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/50">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-900/50 transition-colors">
                    <td className="px-4 py-3 text-slate-300 font-mono truncate max-w-[140px]" title={job.id}>
                      {job.id}
                    </td>
                    <td className="px-4 py-3 text-cyan-300">
                      {job.type}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${
                          job.status === "completed"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : job.status === "processing"
                            ? "bg-cyan-950 text-cyan-400 border border-cyan-800"
                            : job.status === "failed"
                            ? "bg-rose-950 text-rose-400 border border-rose-800"
                            : job.status === "cancelled"
                            ? "bg-slate-800 text-slate-400 border border-slate-700"
                            : "bg-amber-950 text-amber-400 border border-amber-800"
                        }`}
                      >
                        {job.status}
                      </span>
                      {job.error && (
                        <span className="block text-[10px] text-rose-400 mt-1 max-w-[180px] truncate" title={job.error}>
                          {job.error}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {job.progress}%
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {job.attempts}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {job.createdAt ? formatDate(job.createdAt) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {(job.status === "failed" || job.status === "cancelled") && (
                          <button
                            onClick={() => handleRetryJob(job.id)}
                            title="Retry job"
                            className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 hover:bg-cyan-900/60 transition"
                          >
                            <RiRestartLine className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(job.status === "queued" || job.status === "processing") && (
                          <button
                            onClick={() => handleCancelJob(job.id)}
                            title="Cancel job"
                            className="p-1.5 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 transition"
                          >
                            <RiStopCircleLine className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
