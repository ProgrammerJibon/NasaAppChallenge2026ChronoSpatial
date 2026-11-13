"use client";
import { useState } from "react";
import { SkyImage } from "@/components/sky/SkyImage";
import type { Observation } from "@/lib/types";
export function CrossfadeCompare({obsA,obsB,alignedSrcA,alignedSrcB}:{obsA:Observation;obsB:Observation;alignedSrcA?:string;alignedSrcB?:string}) {
  const [blend,setBlend] = useState(50);
  return <div className="space-y-4"><div className="relative w-full aspect-square max-h-[620px] bg-black rounded-xl overflow-hidden"><SkyImage observationId={obsA.id} src={alignedSrcA} alt="Epoch A" className="absolute inset-0 w-full h-full" /><div className="absolute inset-0" style={{opacity:blend/100}}><SkyImage observationId={obsB.id} src={alignedSrcB} alt="Epoch B" className="w-full h-full" /></div></div><label className="flex flex-col gap-3 text-xs text-slate-300"><span className="flex justify-between"><span>Epoch A</span><span>{blend}% Epoch B</span><span>Epoch B</span></span><input aria-label="Crossfade blend" type="range" min={0} max={100} value={blend} onChange={e => setBlend(Number(e.target.value))} className="w-full accent-[var(--accent)]" /></label></div>;
}
