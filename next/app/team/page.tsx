import React from "react";
import teamData from "@/content/team.json";
import { RiTeamLine, RiMapPinUserLine, RiGlobalLine, RiAwardLine, RiGithubLine } from "react-icons/ri";

export default function TeamPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-12 py-4">
      {/* Page Title */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800/60 text-cyan-400 text-xs font-mono">
          <RiTeamLine className="w-3.5 h-3.5" />
          <span>NASA Space Apps Challenge · Global Hackathon</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Team {teamData.team}
        </h1>
        <p className="text-base text-slate-300 leading-relaxed max-w-3xl">
          Proudly representing {teamData.location} in the NASA Space Apps Challenge for the{" "}
          <span className="text-cyan-300 font-medium">{teamData.challenge}</span> challenge.
        </p>
      </div>

      {/* Team Members Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span>Members & Contributions</span>
          </h2>
          <span className="text-xs font-mono text-slate-400">
            {teamData.members.length} Scientists & Engineers
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teamData.members.map((member, index) => {
            const initials = member.name
              .split(" ")
              .filter(Boolean)
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
              .toUpperCase();

            return (
              <div
                key={member.username || index}
                className="relative overflow-hidden rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 p-6 transition-all duration-300 group hover:shadow-lg hover:shadow-cyan-950/30"
              >
                <div className="flex items-start gap-4">
                  {/* Avatar bubble */}
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-600/30 via-slate-800 to-indigo-900/40 border border-cyan-500/30 flex items-center justify-center text-cyan-300 font-bold text-lg font-mono tracking-wider shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                    {initials}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1.5">
                    <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors">
                      {member.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="text-cyan-400">@{member.username}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <RiMapPinUserLine className="w-3 h-3 text-cyan-400" />
                        {member.country}
                      </span>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/60 font-mono">
                        Full-Stack & Astronomy
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-cyan-950/50 text-cyan-300 border border-cyan-800/40 font-mono">
                        Space Apps 2026
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Mission Vision & NASA Space Apps Context */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/70 border border-cyan-800/50 flex items-center justify-center text-cyan-400">
            <RiAwardLine className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Our Motivation</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Astrophysical surveys like SPHEREx gather hundreds of millions of spectra across the universe. Our goal is to empower both professional researchers and citizen scientists to explore repeat all-sky observations without friction.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-950/70 border border-indigo-800/50 flex items-center justify-center text-indigo-400">
            <RiGlobalLine className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">From Barisal to Cosmos</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Representing Barisal, Bangladesh on the international stage, Team A-JINX combines software engineering, spatial data pipelines, and astrometric computing to deliver real scientific utility.
          </p>
        </div>

        <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-sky-950/70 border border-sky-800/50 flex items-center justify-center text-sky-400">
            <RiTeamLine className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-white">Clean Architecture</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Built from scratch with zero ORM overhead: a responsive Next.js frontend, a high-throughput Express TypeScript API, and an Astropy/SciPy Python scientific worker for authentic FITS analysis.
          </p>
        </div>
      </section>
    </div>
  );
}
