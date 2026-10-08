"use client";

import React, { useState, useEffect } from "react";
import { api, ApiError } from "@/lib/api";
import type { ReviewItem, ReviewStats } from "@/lib/types";
import { ReviewCard } from "@/components/review/ReviewCard";
import { ReviewActions } from "@/components/review/ReviewActions";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { BeginnerExplainer } from "@/components/ui/BeginnerExplainer";
import { useLanguage } from "@/lib/i18n";
import {
  RiEyeLine,
  RiCommunityLine,
  RiShieldCheckLine,
  RiSparklingLine,
  RiCompass3Line,
  RiContrast2Line,
  RiAlertLine,
} from "react-icons/ri";

export default function ReviewPage() {
  const { t } = useLanguage();
  const [item, setItem] = useState<ReviewItem | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get or create anonymous visitor token
  const getVisitorId = () => {
    if (typeof window === "undefined") return "anonymous";
    let vid = localStorage.getItem("spx_visitor_id");
    if (!vid) {
      vid = "v_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem("spx_visitor_id", vid);
    }
    return vid;
  };

  const loadNextItem = async () => {
    try {
      setLoading(true);
      setError(null);
      const visitorId = getVisitorId();
      const nextItem = await api.getNextReview(visitorId);
      setItem(nextItem);

      if (nextItem.comparisonId) {
        const reviewStats = await api.getReviewStats(nextItem.comparisonId);
        setStats(reviewStats);
      }
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : "Failed to load review candidate.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNextItem();
  }, []);

  const handleSubmitReview = async (classification: string, confidence: number) => {
    if (!item) return;
    setSubmitting(true);
    try {
      const visitorId = getVisitorId();
      await api.submitReview({
        comparisonId: item.comparisonId,
        candidateId: item.candidateId,
        visitorHash: visitorId,
        classification,
        confidence,
      });

      // Refresh community stats
      const updatedStats = await api.getReviewStats(item.comparisonId);
      setStats(updatedStats);
    } catch (err: any) {
      alert("Failed to submit review: " + (err.message || "Error"));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) {
    return (
      <ErrorState
        title="Review data unavailable"
        message={error}
        onRetry={loadNextItem}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RiEyeLine className="text-purple-400 w-5 h-5" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              {t("reviewHeading")}
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            {t("reviewSub")}
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono">
          <RiShieldCheckLine className="text-emerald-400 w-4 h-4" />
          <span>{t("privacyBadge")}</span>
        </div>
      </div>

      {/* Beginner Guide Explainer */}
      <BeginnerExplainer
        pageTitle={t("citizenReviewTitle")}
        pagePurpose={t("citizenReviewDesc")}
        items={[
          {
            icon: <RiSparklingLine className="w-4 h-4 text-amber-400" />,
            term: t("transientTitle"),
            definition: t("differenceDesc"),
          },
          {
            icon: <RiCompass3Line className="w-4 h-4 text-cyan-400" />,
            term: t("movingObjectTitle"),
            definition: t("swipeDesc"),
          },
          {
            icon: <RiContrast2Line className="w-4 h-4 text-purple-400" />,
            term: t("variableStarTitle"),
            definition: t("blinkDesc"),
          },
          {
            icon: <RiAlertLine className="w-4 h-4 text-rose-400" />,
            term: t("artifactTitle"),
            definition: t("significanceDesc"),
          },
        ]}
      />

      {/* Main Review Stage */}
      {loading ? (
        <Skeleton className="w-full h-[500px] rounded-3xl" />
      ) : item ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Visual Viewer */}
          <div className="lg:col-span-7">
            <ReviewCard item={item} />
          </div>

          {/* Right: Classification Controls & Community Stats */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <ReviewActions
              onSubmit={handleSubmitReview}
              onNext={loadNextItem}
              submitting={submitting}
            />

            {/* Community Stats */}
            {stats && stats.totalReviews > 0 && (
              <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                    <RiCommunityLine className="text-sky-400" />
                    <span>{t("communityStats")}</span>
                  </div>
                  <span className="font-mono text-slate-400">
                    {stats.totalReviews} {stats.totalReviews === 1 ? "review" : "reviews"}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {Object.entries(stats.classifications).map(([key, count]) => {
                    const percentage = Math.round((count / stats.totalReviews) * 100);
                    return (
                      <div key={key} className="space-y-0.5">
                        <div className="flex justify-between text-[11px] text-slate-300">
                          <span>{key}</span>
                          <span className="font-mono text-slate-400">{count} ({percentage}%)</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="p-12 text-center text-slate-400 bg-slate-900/40 rounded-3xl border border-slate-800">
          No candidates currently queued for review. Check back soon!
        </div>
      )}
    </div>
  );
}
