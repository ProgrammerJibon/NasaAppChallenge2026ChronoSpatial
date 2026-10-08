"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import teamData from "@/content/team.json";
import { Reveal } from "@/components/motion/Reveal";
import { useLanguage } from "@/lib/i18n";
import {
  RiTeamLine,
  RiMapPinUserLine,
  RiGlobalLine,
  RiAwardLine,
  RiExternalLinkLine,
  RiShieldCheckFill,
  RiSparklingLine,
  RiCodeSSlashLine,
  RiCpuLine,
  RiDatabase2Line,
  RiLayoutMasonryLine,
  RiRocketLine,
  RiContrast2Line,
  RiCompass3Line,
} from "react-icons/ri";

interface MemberSpecialization {
  [username: string]: {
    skills: string[];
    bio?: string;
  };
}

const MEMBER_SPECIALIZATIONS: MemberSpecialization = {
  programmerjibon: {
    skills: ["Full-Stack Architecture", "Astropy Engine", "FITS Pipelines", "Real-Time Systems", "DevOps & CI/CD"],
    bio: "Leading full-stack engineering, scientific computation pipeline, and zero-ORM high-throughput API architecture.",
  },
  asfack_ahamed: {
    skills: ["System Architecture", "UI/UX Engineering", "Spatial Interaction"],
    bio: "Crafting modern observatory-grade user interfaces, responsive visual design, and clean component architecture.",
  },
  mihafyor: {
    skills: ["Data Science", "Photutils & DAOStarFinder", "Signal Verification", "Statistical Analysis"],
    bio: "Developing astronomical data mining algorithms, source detection, and significance verification models.",
  },
  turjo12345: {
    skills: ["Data Analysis", "Multi-Epoch Flux", "Astrometric Calibration", "Spectral Inspection"],
    bio: "Analyzing multi-epoch flux variations, celestial coordinate transformations, and candidate transient classification.",
  },
};

function MemberAvatar({ name, image }: { name: string; image?: string }) {
  const [hasError, setHasError] = useState(false);
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl overflow-hidden shrink-0 border-2 border-cyan-500/30 bg-slate-950 shadow-lg shadow-cyan-950/40 group-hover:border-cyan-400 group-hover:scale-105 transition-all duration-300">
      {image && !hasError ? (
        <Image
          src={image}
          alt={name}
          width={128}
          height={128}
          unoptimized
          onError={() => setHasError(true)}
          className="w-full h-full object-cover object-center"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-cyan-600/30 via-slate-800 to-indigo-900/40 flex items-center justify-center text-cyan-300 font-bold text-xl sm:text-2xl font-mono tracking-wider">
          {initials}
        </div>
      )}
      <div
        className="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-950 p-1 rounded-full shadow-md"
        title="Verified NASA Space Apps Contributor"
      >
        <RiShieldCheckFill className="w-3.5 h-3.5" />
      </div>
    </div>
  );
}

function getRoleBadge(role: string) {
  if (role.toLowerCase().includes("lead") || role.toLowerCase().includes("engineer")) {
    return {
      icon: <RiCodeSSlashLine className="w-3.5 h-3.5" />,
      colorClass: "bg-cyan-950/70 text-cyan-300 border-cyan-700/60",
    };
  }
  if (role.toLowerCase().includes("architecture") || role.toLowerCase().includes("design")) {
    return {
      icon: <RiLayoutMasonryLine className="w-3.5 h-3.5" />,
      colorClass: "bg-indigo-950/70 text-indigo-300 border-indigo-700/60",
    };
  }
  return {
    icon: <RiDatabase2Line className="w-3.5 h-3.5" />,
    colorClass: "bg-emerald-950/70 text-emerald-300 border-emerald-700/60",
  };
}

export default function TeamPage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-6xl mx-auto space-y-16 py-6">
      {/* Hero Section */}
      <section className="relative rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/60 to-slate-950/90 border border-slate-800/80 p-8 sm:p-12 overflow-hidden shadow-2xl shadow-cyan-950/20">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="relative space-y-6 max-w-4xl">
          <Reveal>
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <RiAwardLine className="w-4 h-4 text-cyan-300" />
              <span>{t("nasaVerified", "NASA Space Apps 2026")} · Global Hackathon</span>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
              Team{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                {teamData.team}
              </span>
            </h1>
          </Reveal>

          <Reveal delay={0.2}>
            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              Proudly representing <strong className="text-white">{teamData.location}</strong> in the NASA Space Apps Challenge for the{" "}
              <span className="text-cyan-300 font-semibold">{teamData.challenge}</span> challenge. Developing observatory-grade tools to uncover how the universe changes over time.
            </p>
          </Reveal>

          {/* Official Button Callout */}
          <Reveal delay={0.3}>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={teamData.pageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-sm sm:text-base shadow-xl shadow-cyan-500/25 active:scale-95 transition-all duration-300"
              >
                <RiRocketLine className="w-5 h-5 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
                <span>{t("viewOnNasaPortal", "View on NASA Space Apps Portal")}</span>
                <RiExternalLinkLine className="w-4 h-4 opacity-80 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>

              <Link
                href="/explore"
                className="inline-flex items-center gap-2 px-5 py-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-medium text-sm active:scale-95 transition"
              >
                <RiCompass3Line className="w-4 h-4 text-cyan-400" />
                <span>{t("heroExploreBtn", "Explore Sky")}</span>
              </Link>
            </div>
          </Reveal>

          {/* Quick Info Tags */}
          <Reveal delay={0.4}>
            <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-mono text-slate-400">
              <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300 flex items-center gap-1.5">
                <RiMapPinUserLine className="w-3.5 h-3.5 text-cyan-400" />
                <span>Barisal, Bangladesh 🇧🇩</span>
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                🪐 Planet X & SPHEREx
              </span>
              <span className="px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60 text-slate-300">
                🔭 102 Near-Infrared Bands
              </span>
              <span className="px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-300 flex items-center gap-1">
                <RiSparklingLine className="w-3.5 h-3.5" />
                <span>4 Specialists</span>
              </span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Impact & Mission Metric Strip */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-cyan-400 font-mono">4</div>
          <div className="text-xs font-semibold text-white">{t("teamSpecialists", "Dedicated Specialists")}</div>
          <div className="text-[11px] text-slate-400">Software & Astrophysics</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-sky-400 font-mono">102</div>
          <div className="text-xs font-semibold text-white">{t("teamSpectralChannels", "Spectral Channels")}</div>
          <div className="text-[11px] text-slate-400">0.75 – 5.0 µm Coverage</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-indigo-400 font-mono">450M+</div>
          <div className="text-xs font-semibold text-white">{t("teamTargetSources", "All-Sky Sources")}</div>
          <div className="text-[11px] text-slate-400">Stars, Galaxies & Asteroids</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800/80 text-center space-y-1">
          <div className="text-2xl sm:text-3xl font-extrabold text-purple-400 font-mono">6 Mo</div>
          <div className="text-xs font-semibold text-white">{t("teamSurveyCadence", "Survey Cadence")}</div>
          <div className="text-[11px] text-slate-400">Full-Sky Repeat Rate</div>
        </div>
      </section>

      {/* Team Members Grid */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <RiTeamLine className="w-6 h-6 text-cyan-400" />
              <span>{t("membersCrew", "Mission Crew & Contributors")}</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {t("membersCrewSub", "Scientists and engineers behind Chrono & Spatial")}
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 self-start sm:self-auto">
            {teamData.members.length} {t("teamMembersCount", "Scientists & Engineers")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamData.members.map((member, index) => {
            const roleBadge = getRoleBadge(member.role);
            const spec = MEMBER_SPECIALIZATIONS[member.username] || {
              skills: ["Astronomy", "Software Engineering"],
              bio: "Contributing to the NASA Space Apps Challenge 2026.",
            };

            return (
              <Reveal key={member.username || index} delay={index * 0.1}>
                <div className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 p-6 sm:p-7 transition-all duration-300 group hover:shadow-xl hover:shadow-cyan-950/30 flex flex-col justify-between h-full">
                  <div className="space-y-5">
                    {/* Header: Avatar, Name, Handle */}
                    <div className="flex items-start gap-4">
                      <MemberAvatar name={member.name} image={member.image} />

                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="space-y-1">
                          <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                            {member.name}
                          </h3>
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                            <span className="text-cyan-400 font-semibold">@{member.username}</span>
                            <span>·</span>
                            <span className="flex items-center gap-1 text-slate-300">
                              <RiMapPinUserLine className="w-3.5 h-3.5 text-cyan-400" />
                              {member.country} 🇧🇩
                            </span>
                          </div>
                        </div>

                        {/* Role Badge */}
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg border text-xs font-medium font-mono"
                          style={{}}
                        >
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-xs font-semibold ${roleBadge.colorClass}`}>
                            {roleBadge.icon}
                            <span>{member.role}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Member Bio Summary */}
                    {spec.bio && (
                      <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                        {spec.bio}
                      </p>
                    )}

                    {/* Skills / Specializations */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                        Core Disciplines
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {spec.skills.map((skill, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[11px] px-2.5 py-1 rounded-md bg-slate-800/90 text-slate-300 border border-slate-700/60 font-mono"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Space Apps profile link */}
                  <div className="pt-5 mt-5 border-t border-slate-800/80 flex items-center justify-between">
                    <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                      <RiShieldCheckFill className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{t("teamMemberBadge", "Space Apps 2026 Contributor")}</span>
                    </span>

                    <a
                      href={teamData.pageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-cyan-950/80 text-slate-300 hover:text-cyan-300 border border-slate-700/60 hover:border-cyan-500/40 text-xs font-medium transition-all group/btn"
                    >
                      <span>Space Apps</span>
                      <RiExternalLinkLine className="w-3.5 h-3.5 opacity-70 group-hover/btn:opacity-100 group-hover/btn:translate-x-0.5 transition-all" />
                    </a>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Engineering Pillars & Architecture */}
      <section className="space-y-6">
        <div className="border-b border-slate-800 pb-3">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <RiCpuLine className="w-5 h-5 text-indigo-400" />
            <span>Mission Architecture & Technical Pillars</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
                <RiAwardLine className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">{t("teamOurMotivation", "Our Motivation")}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("teamMotivationDesc", "Astrophysical surveys like SPHEREx gather hundreds of millions of spectra across the universe. Our goal is to empower both professional researchers and citizen scientists to explore repeat all-sky observations without friction.")}
              </p>
            </div>
            <div className="pt-2 text-[11px] font-mono text-cyan-400 flex items-center gap-1">
              <span>Scientific Rigor & Exploration</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
                <RiGlobalLine className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">{t("teamFromBarisal", "From Barisal to Cosmos")}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("teamFromBarisalDesc", "Representing Barisal, Bangladesh on the international stage, Team A-JINX combines software engineering, spatial data pipelines, and astrometric computing to deliver real scientific utility.")}
              </p>
            </div>
            <div className="pt-2 text-[11px] font-mono text-indigo-400 flex items-center gap-1">
              <span>Global Hackathon Participation</span>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3.5 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-sky-950/70 border border-sky-800/50 flex items-center justify-center text-sky-400">
                <RiCpuLine className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">{t("teamArchitecture", "Clean Architecture")}</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                {t("teamArchitectureDesc", "Built from scratch with zero ORM overhead: a responsive Next.js frontend, a high-throughput Express TypeScript API, and an Astropy/SciPy Python scientific worker for authentic FITS analysis.")}
              </p>
            </div>
            <div className="pt-2 text-[11px] font-mono text-sky-400 flex items-center gap-1">
              <span>Zero-ORM High Performance</span>
            </div>
          </div>
        </div>
      </section>

      {/* NASA Space Apps 2026 Spotlight Card with Large Direct Button */}
      <section className="relative rounded-3xl bg-gradient-to-r from-cyan-950/50 via-slate-900 to-indigo-950/50 border border-cyan-800/40 p-8 sm:p-10 text-center space-y-6 shadow-2xl">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/70 border border-cyan-700/60 text-cyan-300 text-xs font-mono">
            <RiSparklingLine className="w-3.5 h-3.5" />
            <span>NASA Space Apps Challenge 2026 Official Submission</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Connect with Team A-JINX on NASA Space Apps
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Visit our team page on the official NASA Space Apps Challenge portal to track our challenge progress, read project details, and connect with team members.
          </p>
        </div>

        <div className="pt-2 flex justify-center">
          <a
            href={teamData.pageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-bold text-base shadow-xl shadow-cyan-500/30 active:scale-95 transition-all group"
          >
            <RiAwardLine className="w-5 h-5 text-cyan-200" />
            <span>{t("viewOnNasaPortal", "View on NASA Space Apps Portal")}</span>
            <RiExternalLinkLine className="w-4 h-4 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-transform" />
          </a>
        </div>
      </section>
    </div>
  );
}
