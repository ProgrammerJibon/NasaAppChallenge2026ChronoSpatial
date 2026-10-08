"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { BootstrapData, SkyRegion } from "@/lib/types";
import { SkyImage } from "@/components/sky/SkyImage";
import { Reveal } from "@/components/motion/Reveal";
import { Counter } from "@/components/motion/Counter";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { BeginnerExplainer } from "@/components/ui/BeginnerExplainer";
import { useLanguage } from "@/lib/i18n";
import {
  RiCompass3Line,
  RiTimeLine,
  RiContrast2Line,
  RiEyeLine,
  RiArrowRightLine,
  RiSparklingLine,
  RiShieldCheckLine,
} from "react-icons/ri";

export default function HomePage() {
  const { t } = useLanguage();
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [regions, setRegions] = useState<SkyRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [bsData, regData] = await Promise.all([
          api.getBootstrap(),
          api.getRegions().catch(() => []),
        ]);
        setBootstrap(bsData);
        setRegions(regData);
      } catch (err: any) {
        setError(err.message || "Failed to initialize mission explorer.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const demoObs = bootstrap?.demoObservations?.[0];
  const demoCompId = bootstrap?.demoComparisonId;

  return (
    <div className="flex flex-col gap-20">
      {/* Hero Section */}
      <section className="relative pt-6 pb-12 lg:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Hero Text */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <Reveal>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-mono">
                <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                <span>{t("heroBadge")}</span>
              </div>
            </Reveal>

            <Reveal delay={0.1}>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.1]">
                {t("heroTitlePrefix")}{" "}
                <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  {t("heroTitleHighlight")}
                </span>
              </h1>
            </Reveal>

            <Reveal delay={0.2}>
              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
                {t("heroDesc")}
              </p>
            </Reveal>

            <Reveal delay={0.3}>
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/explore"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/25 active:scale-95 transition"
                >
                  <RiCompass3Line className="w-5 h-5" />
                  <span>{t("heroExploreBtn")}</span>
                </Link>

                <Link
                  href={demoCompId ? `/compare?id=${demoCompId}` : "/compare"}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold text-sm active:scale-95 transition"
                >
                  <RiContrast2Line className="w-5 h-5 text-purple-400" />
                  <span>{t("heroCompareBtn")}</span>
                </Link>
              </div>
            </Reveal>

            <Reveal delay={0.4}>
              <div className="flex items-center gap-2 text-xs text-slate-400 pt-2">
                <RiShieldCheckLine className="w-4 h-4 text-emerald-400" />
                <span>{t("heroTrustBadge")}</span>
              </div>
            </Reveal>
          </div>

          {/* Right Hero Visual Card */}
          <div className="lg:col-span-5">
            <Reveal delay={0.2}>
              <div className="relative rounded-3xl bg-slate-900/80 border border-slate-800 p-3 shadow-2xl shadow-sky-950/30">
                <div className="relative aspect-square rounded-2xl overflow-hidden bg-black">
                  {loading ? (
                    <Skeleton className="w-full h-full" />
                  ) : demoObs ? (
                    <SkyImage
                      observationId={demoObs.id}
                      alt="Real SPHEREx Observation"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full text-slate-400 text-xs">
                      Visualizing SPHEREx Near-Infrared Sky
                    </div>
                  )}

                  {/* Corner Label */}
                  <div className="absolute top-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md border border-slate-800 text-xs font-mono text-slate-200">
                    <span className="text-sky-400 font-bold">Andromeda M31</span> · Real SPHEREx Epoch
                  </div>
                </div>

                <div className="p-3 flex items-center justify-between text-xs text-slate-400">
                  <span className="font-mono">Band 2 (1.11 – 1.64 µm)</span>
                  <Link
                    href="/explore"
                    className="text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
                  >
                    Open in Viewer <RiArrowRightLine />
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Mission Statistics Strip */}
      <section className="p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white">
              <Counter value={102} />
            </div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
              {t("statChannels")}
            </p>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-sky-400">
              <Counter value={6} suffix={` ${t("suffixMonths")}`} />
            </div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
              {t("statCadence")}
            </p>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-purple-400">
              <Counter value={4} suffix={` ${t("suffixPasses")}`} />
            </div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
              {t("statCoverage")}
            </p>
          </div>

          <div>
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-400">
              <Counter value={450} suffix="M+" />
            </div>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider font-medium">
              {t("statSources")}
            </p>
          </div>
        </div>
      </section>

      {/* Beginner Guide Overview */}
      <BeginnerExplainer
        pageTitle={t("exploreHeading")}
        pagePurpose={t("heroDesc")}
        items={[
          {
            icon: <RiCompass3Line className="w-4 h-4 text-cyan-400" />,
            term: t("raDecTitle"),
            definition: t("raDecDesc"),
          },
          {
            icon: <RiTimeLine className="w-4 h-4 text-sky-400" />,
            term: t("epochTitle"),
            definition: t("epochDesc"),
          },
          {
            icon: <RiSparklingLine className="w-4 h-4 text-amber-400" />,
            term: t("bandTitle"),
            definition: t("bandDesc"),
          },
          {
            icon: <RiEyeLine className="w-4 h-4 text-emerald-400" />,
            term: t("citizenReviewTitle"),
            definition: t("citizenReviewDesc"),
          },
        ]}
      />

      {/* 3-Step Challenge Workflow */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {t("workflowTitle")}
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            {t("workflowSub")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Step 1 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center mb-4">
              <RiCompass3Line className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-sky-400 uppercase tracking-widest font-bold">
              {t("stepLabel")} 1
            </span>
            <h3 className="text-base font-semibold text-white mt-1 mb-2">
              {t("step1Title")}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {t("step1Desc")}
            </p>
            <Link
              href="/explore"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1"
            >
              {t("step1Btn")} <RiArrowRightLine />
            </Link>
          </div>

          {/* Step 2 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center mb-4">
              <RiTimeLine className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-purple-400 uppercase tracking-widest font-bold">
              {t("stepLabel")} 2
            </span>
            <h3 className="text-base font-semibold text-white mt-1 mb-2">
              {t("step2Title")}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {t("step2Desc")}
            </p>
            <Link
              href="/timeline"
              className="text-xs text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1"
            >
              {t("step2Btn")} <RiArrowRightLine />
            </Link>
          </div>

          {/* Step 3 */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4">
              <RiContrast2Line className="w-5 h-5" />
            </div>
            <span className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-bold">
              {t("stepLabel")} 3
            </span>
            <h3 className="text-base font-semibold text-white mt-1 mb-2">
              {t("step3Title")}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              {t("step3Desc")}
            </p>
            <Link
              href="/compare"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
            >
              {t("step3Btn")} <RiArrowRightLine />
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Sky Regions */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {t("curatedRegionsTitle")}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t("curatedRegionsSub")}
            </p>
          </div>
          <Link
            href="/explore"
            className="text-xs font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
          >
            {t("allRegions")} <RiArrowRightLine />
          </Link>
        </div>

        {error ? (
          <ErrorState
            title="Backend connection required"
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {regions.map((region) => (
              <Link
                key={region.id}
                href={`/explore?region=${region.slug}`}
                className="group p-5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-sky-500/60 hover:bg-slate-850 transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-sky-400">
                      RA {region.ra.toFixed(2)}° · Dec {region.dec.toFixed(2)}°
                    </span>
                    <RiSparklingLine className="text-slate-400 group-hover:text-amber-400 transition" />
                  </div>
                  <h3 className="text-base font-semibold text-white group-hover:text-sky-300 transition">
                    {region.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {region.description}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] text-slate-400">{t("epochObservations")}</span>
                  <span className="text-sky-400 group-hover:translate-x-1 transition-transform">
                    {t("exploreRegion")} →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Citizen Review Banner */}
      <section className="p-8 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900 border border-indigo-900/50 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider font-bold">
            {t("publicCitizenScience")}
          </span>
          <h3 className="text-xl font-bold text-white mt-1">
            {t("helpVerifyChanges")}
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 max-w-lg leading-relaxed">
            {t("helpVerifyDesc")}
          </p>
        </div>
        <Link
          href="/review"
          className="px-6 py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs whitespace-nowrap shadow-lg shadow-purple-950/30 transition flex items-center gap-2"
        >
          <RiEyeLine className="w-4 h-4" />
          <span>{t("startReviewing")}</span>
        </Link>
      </section>
    </div>
  );
}
