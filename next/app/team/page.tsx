"use client";
import { useState } from "react";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
import team from "@/content/team.json";
function Portrait({member}:{member:typeof team.members[number]}) {
  const [failed,setFailed]=useState(false);
  return <div className="crew-portrait">{failed ? <span>{member.name.split(' ').filter(word=>!['MD.'].includes(word)).slice(0,2).map(word=>word[0]).join('')}</span> : <img src={member.image} alt={member.name} loading="lazy" onError={()=>setFailed(true)}/>}</div>;
}
export default function TeamPage() {
  const [selected,setSelected]=useState<string|null>(null);
  const topics=[
    {label:'Who built this?',keywords:['who','built','team'],answer:'Team A-JINX: Jibon, Siam, Fahim, and Turjo. Our roles span engineering, design, research, and data science.'},
    {label:'Where is the team from?',keywords:['from','where','bangladesh'],answer:'We are based in Barisal, Bangladesh.'},
    {label:'What is the project for?',keywords:['project','challenge','why'],answer:'Chrono & Spatial was created for the Planet X and SPHEREx challenge, to make repeat sky observations easier to explore.'},
    {label:'Meet Fahim',keywords:['fahim','mihafyor'],answer:'Fahim works on data science and research. I have highlighted his team card.',action:()=>setSelected('mihafyor')}
  ];
  return <MissionWorkspace title="Meet the mission crew." subtitle="Four people. One shared curiosity about the sky." scene="ship" welcome="We are Team A-JINX from Barisal, Bangladesh. These are the people behind Chrono & Spatial." topics={topics}>
    <div className="crew-grid">{team.members.map(member=><article className={`crew-card ${selected===member.username ? 'crew-selected' : ''}`} key={member.username}><Portrait member={member}/><h2>{member.name}</h2><p>{member.role}</p><button type="button" aria-expanded={selected===member.username} onClick={()=>setSelected(previous=>previous===member.username ? null : member.username)}>{selected===member.username ? 'Less about me −' : 'Meet me +'}</button>{selected===member.username && <div className="crew-detail"><span>@{member.username}</span><span>{member.country}</span><span>Team A-JINX · NASA Space Apps contributor</span></div>}</article>)}</div>
    <a className="secondary-link w-fit" href={team.pageUrl} target="_blank" rel="noreferrer">Our NASA Space Apps team page ↗</a>
    <ScienceDetails title="Project information"><dl className="review-measurements"><div><dt>Team</dt><dd>{team.team}</dd></div><div><dt>Challenge</dt><dd>{team.challenge}</dd></div><div><dt>Location</dt><dd>{team.location}</dd></div></dl><p>Our goal is to make repeat infrared observations easier to inspect, while keeping their dates, wavelengths, and sources visible.</p></ScienceDetails>
  </MissionWorkspace>;
}
