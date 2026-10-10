"use client";
import { useState } from "react";
import { BlinkCompare } from "@/components/compare/BlinkCompare";
import { SkyImage } from "@/components/sky/SkyImage";
import { ScienceDetails } from "@/components/mission/MissionWorkspace";
import { api } from "@/lib/api";
import type { ReviewItem } from "@/lib/types";
export function ReviewCard({item}:{item:ReviewItem}) {
  const [view,setView]=useState('blink');
  const comparison=item.comparison, candidate=item.candidate;
  const a=comparison?.observationA,b=comparison?.observationB;
  return <div className="space-y-4"><div className="compare-mode-bar"><button type="button" aria-pressed={view==='blink'} onClick={()=>setView('blink')}>Blink between dates</button><button type="button" aria-pressed={view==='difference'} onClick={()=>setView('difference')}>Show change map</button></div><p className="mode-hint">A demonstration example. These labels are not confirmed discoveries.</p><div className="compare-stage">{view==='blink' && a && b ? <BlinkCompare obsA={a} obsB={b} alignedSrcA={comparison?.aligned_a_path ? api.getComparisonFileUrl(comparison.id,'aligned-a') : undefined} alignedSrcB={comparison?.aligned_b_path ? api.getComparisonFileUrl(comparison.id,'aligned-b') : undefined}/> : <div className="review-difference"><SkyImage src={api.getComparisonFileUrl(item.comparisonId,'difference')} alt="Demonstration difference map" className="w-full h-full"/></div>}</div><ScienceDetails title="Example measurements">{candidate && <dl className="review-measurements"><div><dt>Example ID</dt><dd>{candidate.id}</dd></div><div><dt>Coordinates</dt><dd>{candidate.ra.toFixed(4)}°, {candidate.dec.toFixed(4)}°</dd></div><div><dt>Example detection score</dt><dd>{candidate.score.toFixed(1)}%</dd></div><div><dt>Displacement</dt><dd>{candidate.motion_arcsec} arcseconds</dd></div><div><dt>Brightness difference</dt><dd>{candidate.brightness_change}</dd></div></dl>}</ScienceDetails></div>;
}
