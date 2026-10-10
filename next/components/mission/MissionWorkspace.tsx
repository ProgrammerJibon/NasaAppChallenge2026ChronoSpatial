"use client";
import { useState, type ReactNode } from "react";
import { RiPauseLine, RiPlayLine } from "react-icons/ri";
import { MissionGuide } from "./MissionGuide";
import { SpaceScene, type SceneKind } from "./SpaceScene";
import type { GuideTopic } from "@/lib/missionGuide";

export function MissionWorkspace({title,subtitle,scene="planet",welcome,context,topics,children}:{title:string;subtitle:string;scene?:SceneKind;welcome:string;context?:string;topics:GuideTopic[];children:ReactNode}) {
  const [paused,setPaused] = useState(false);
  return <div className={`mission-shell ${paused ? "effects-paused" : ""}`}>
    <header className="mission-intro"><div><span className="mission-eyebrow">CHRONO & SPATIAL / YOUR OBSERVATORY</span><h1>{title}</h1><p>{subtitle}</p></div><SpaceScene kind={scene} /><button className="effects-toggle" type="button" aria-label={paused ? "Play decorative effects" : "Pause decorative effects"} onClick={()=>setPaused(p=>!p)}>{paused ? <RiPlayLine/> : <RiPauseLine/>}<span>{paused ? "Play effects" : "Pause effects"}</span></button></header>
    <div className="mission-layout"><div className="mission-content">{children}</div><MissionGuide welcome={welcome} context={context} topics={topics} /></div>
  </div>;
}
export function ScienceDetails({children,title="Scientific details",open,onToggle}:{children:ReactNode;title?:string;open?:boolean;onToggle?:(open:boolean)=>void}) {
  return <details className="science-details" open={open} onToggle={event=>onToggle?.(event.currentTarget.open)}><summary>{title}<span>Optional</span></summary><div className="science-details-content">{children}</div></details>;
}
