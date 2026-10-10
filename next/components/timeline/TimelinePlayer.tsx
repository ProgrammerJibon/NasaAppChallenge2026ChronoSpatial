"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { RiPlayFill, RiPauseFill, RiArrowLeftLine, RiArrowRightLine } from "react-icons/ri";
import { SkyImage } from "@/components/sky/SkyImage";
import { findEpochPair } from "@/lib/observationPairs";
import { formatShortDate } from "@/lib/format";
import type { Observation } from "@/lib/types";
export function TimelinePlayer({observations}:{observations:Observation[]}) {
  const [index,setIndex]=useState(0), [playing,setPlaying]=useState(false), [speed,setSpeed]=useState(1);
  const current=observations[index]??observations[0];
  const move=(direction:number)=>setIndex(previous=>(previous+direction+observations.length)%observations.length);
  useEffect(()=>{
    if(!playing || observations.length<2) return;
    const timer=setInterval(()=>setIndex(i=>(i+1)%observations.length),1500/speed);
    return()=>clearInterval(timer);
  },[playing,speed,observations.length]);
  if(!current) return <div className="mission-empty">No dates are available.</div>;
  const pair=findEpochPair(observations);
  return <div className="space-y-4"><div className="observation-stage"><div className="stage-heading"><strong>{formatShortDate(current.observation_date)}</strong><span>{index+1} / {observations.length} · Band {current.band_number}</span></div><div className="timeline-image"><SkyImage key={current.id} observationId={current.id} alt={`Observation on ${formatShortDate(current.observation_date)}`} className="w-full h-full"/></div><div className="stage-caption">Preview sequence · use Compare for aligned images</div></div>
    <div className="timeline-controls"><button type="button" onClick={()=>move(-1)} disabled={observations.length<2} aria-label="Previous observation"><RiArrowLeftLine/></button><button className="timeline-play" type="button" onClick={()=>setPlaying(p=>!p)} disabled={observations.length<2} aria-label={playing ? 'Pause timeline' : 'Play timeline'}>{playing ? <RiPauseFill/> : <RiPlayFill/>}{playing ? 'Pause' : 'Play'}</button><button type="button" onClick={()=>move(1)} disabled={observations.length<2} aria-label="Next observation"><RiArrowRightLine/></button><label>Speed<select aria-label="Timeline speed" value={speed} onChange={event=>setSpeed(Number(event.target.value))}>{[.5,1,2].map(value=><option value={value} key={value}>{value}×</option>)}</select></label></div>
    <div className="date-choices" role="group" aria-label="Choose an observation date">{observations.map((observation,i)=><button type="button" key={observation.id} aria-pressed={i===index} onClick={()=>{setIndex(i);setPlaying(false);}}>{formatShortDate(observation.observation_date)}</button>)}</div>
    {pair && <Link className="secondary-link" href={`/compare?a=${pair[0].id}&b=${pair[1].id}`}>Compare these dates <RiArrowRightLine/></Link>}
  </div>;
}
