"use client";

import { useState } from "react";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
import team from "@/content/team.json";

type Member = typeof team.members[number];

const memberFocus: Record<string, string> = {
  programmerjibon: "Engineering and research for the observation explorer.",
  asfack_ahamed: "Architecture and design across the project.",
  mihafyor: "Led the app interface and visual design, alongside data research.",
  turjo12345: "Data science and research for the mission concept.",
};

function Portrait({ member }: { member: Member }) {
  const [failed, setFailed] = useState(false);
  const initials = member.name.split(" ").filter((word) => word.toUpperCase() !== "MD.").slice(0, 2).map((word) => word[0]).join("");
  return <span className="team-portrait">{failed ? <span>{initials}</span> : <img src={member.image} alt="" loading="lazy" onError={() => setFailed(true)} />}</span>;
}

export default function TeamPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [orbitRotation, setOrbitRotation] = useState(0);
  const [pressCount, setPressCount] = useState(0);
  const activeMember = team.members.find((member) => member.username === selected);
  const selectMember = (username: string) => {
    const index = team.members.findIndex((member) => member.username === username);
    if (index < 0) return;
    setSelected(username);
    setPressCount((previous) => previous + 1);
    setOrbitRotation((previous) => {
      const target = (2 - index) * 90;
      const turn = ((target - previous + 540) % 360) - 180;
      return previous + (turn === 0 ? 360 : turn);
    });
  };
  const topics = [
    { label: "Who built this?", keywords: ["who", "built", "team"], answer: "Team A-JINX: Jibon leads engineering and research, Siam contributes architecture and design, Fahim led the app design and works on data research, and Turjo contributes data science and research." },
    { label: "Where is the team from?", keywords: ["from", "where", "bangladesh"], answer: "We are based in Barisal, Bangladesh." },
    { label: "What is the project for?", keywords: ["project", "challenge", "why"], answer: "Chrono & Spatial was created for the Planet X and SPHEREx challenge, to make repeat sky observations easier to explore." },
    { label: "Meet Fahim", keywords: ["fahim", "mihafyor"], answer: "Fahim led most of the app’s interface and visual design, alongside data research. I have highlighted his team card.", action: () => selectMember("mihafyor") },
  ];

  return <MissionWorkspace title="Meet the mission crew." subtitle="Four people. One shared curiosity about the sky." scene="ship" welcome="We are Team A-JINX from Barisal, Bangladesh. These are the people behind Chrono & Spatial." topics={topics} showIntro={false} showJourney={false}>
    <section className="team-hero" aria-labelledby="team-title">
      <div className="team-hero-copy">
        <span className="team-kicker">CHRONO &amp; SPATIAL / THE PEOPLE BEHIND THE PROJECT</span>
        <h1 id="team-title">A small team.<br /><em>A wider view.</em></h1>
        <p>From Barisal to the infrared sky, Team A-JINX brings design, engineering, architecture, and data research together in one observatory.</p>
        <a href="#team-members" className="team-hero-link">Meet the crew <span aria-hidden="true">↓</span></a>
        <div className="team-hero-meta"><span><strong>04</strong> contributors</span><span><strong>01</strong> shared mission</span><span>Barisal · Bangladesh</span></div>
      </div>

      <div className="team-orbit" aria-label="Select a team member to see their contribution">
        <div className="team-blackhole-scene" aria-hidden="true"><video autoPlay muted loop playsInline preload="metadata" src="/videos/black-hole-stationary-hd.mp4" /><div className="team-blackhole-fallback" /></div>
        <div className="team-orbit-wheel" style={{ transform: `rotate(${orbitRotation}deg)` }}>
          <div className="team-orbit-rings" aria-hidden="true"><span /><span /><span /></div>
          <svg className="team-orbit-lines" viewBox="0 0 500 500" aria-hidden="true"><path d="M250 250 C244 184 252 123 250 68M250 250 C315 246 374 253 432 250M250 250 C257 312 248 375 250 432M250 250 C186 253 124 245 68 250" /><circle cx="250" cy="250" r="5" /></svg>
          {team.members.map((member, index) => <button className={`team-orbit-node team-orbit-node-${index + 1}`} type="button" key={member.username} aria-label={`Show ${member.name}, ${member.role}`} aria-pressed={selected === member.username} onClick={() => selectMember(member.username)}><span className="team-node-content" style={{ transform: `rotate(${-orbitRotation}deg)` }}><Portrait member={member} /><span>{member.name.split(" ").filter((word) => word.toUpperCase() !== "MD.").at(-1)}</span></span>{selected === member.username && <span key={pressCount} className="team-node-burst" aria-hidden="true" />}</button>)}
        </div>
        <div className="team-orbit-core"><span>TEAM</span><strong>A-JINX</strong><small>SPHEREx Explorer</small></div>
        <div className="team-orbit-selection-slot" aria-live="polite">{activeMember && <div key={pressCount} className="team-orbit-selection"><span>IN FOCUS</span><strong>{activeMember.name}</strong><small>{activeMember.role}</small></div>}</div>
      </div>
    </section>

    <section id="team-members" className="team-members" aria-labelledby="team-members-title">
      <div className="team-section-heading"><div><span className="team-kicker">01 / MEET THE CREW</span><h2 id="team-members-title">The people who built it.</h2></div><p>Select a portrait above or a card below to explore each contribution.</p></div>
      <div className="team-member-grid">{team.members.map((member, index) => <button type="button" className="team-member-card" data-active={selected === member.username} key={member.username} onClick={() => selectMember(member.username)} aria-pressed={selected === member.username}>
        <span className="team-member-number">0{index + 1} / 04</span>
        <Portrait member={member} />
        <span className="team-member-name">{member.name}</span>
        <span className="team-member-role">{member.role}</span>
        <span className="team-member-focus">{memberFocus[member.username]}</span>
        <span className="team-member-handle">@{member.username} <span aria-hidden="true">↗</span></span>
      </button>)}</div>
    </section>

    <section className="team-close"><div><span className="team-kicker">02 / OUR SHARED GOAL</span><h2>Make the evidence easier to see.</h2><p>Chrono &amp; Spatial connects real SPHEREx observations with approachable tools for viewing the sky, comparing dates, and checking a possible change.</p></div><a href={team.pageUrl} target="_blank" rel="noopener noreferrer">Our NASA Space Apps team page <span aria-hidden="true">↗</span></a></section>
    <ScienceDetails title="Project information"><dl className="review-measurements"><div><dt>Team</dt><dd>{team.team}</dd></div><div><dt>Challenge</dt><dd>{team.challenge}</dd></div><div><dt>Location</dt><dd>{team.location}</dd></div></dl></ScienceDetails>
  </MissionWorkspace>;
}
