"use client";
import { useState } from "react";
import type { Comparison, Observation, ChangeCandidate } from "@/lib/types";
import { SideBySide } from "./SideBySide";
import { SwipeCompare } from "./SwipeCompare";
import { BlinkCompare } from "./BlinkCompare";
import { CrossfadeCompare } from "./CrossfadeCompare";
import { DifferenceView } from "./DifferenceView";
import { ChangeSummary } from "./ChangeSummary";
import { ScienceDetails } from "@/components/mission/MissionWorkspace";
import { api } from "@/lib/api";
export function CompareWorkspace({comparison,obsA,obsB,showScience=false}:{comparison:Comparison;obsA:Observation;obsB:Observation;showScience?:boolean}) {
  const [mode,setMode]=useState('swipe');
  const [candidate,setCandidate]=useState<ChangeCandidate|null>(null);
  const current=!showScience && ['difference','significance'].includes(mode) ? 'swipe' : mode;
  const alignedA=comparison.aligned_a_path ? api.getComparisonFileUrl(comparison.id,'aligned-a') : undefined;
  const alignedB=comparison.aligned_b_path ? api.getComparisonFileUrl(comparison.id,'aligned-b') : undefined;
  const shared={obsA,obsB,alignedSrcA:alignedA,alignedSrcB:alignedB};
  const modes=[['swipe','Slide'],['blink','Blink'],['fade','Blend'],['side-by-side','Side by side'],...(showScience ? [['difference','Change map'],['significance','Noise check']] : [])];
  const hints:Record<string,string>={swipe:'Drag the divider to reveal the first or second image.',blink:'Press play to alternate between the two dates.',fade:'Move the slider to blend the two observations.','side-by-side':'Two dates, next to each other.',difference:'Red means brighter in the second image; blue means fainter.',significance:'A larger signal here means the change is stronger relative to estimated noise.'};
  return <div className="space-y-4"><div className="compare-mode-bar" role="group" aria-label="Comparison view">{modes.map(([id,label])=><button type="button" key={id} aria-pressed={current===id} onClick={()=>setMode(id)}>{label}</button>)}</div><p className="mode-hint">{hints[current]}</p><div className="compare-stage">
    {current==='side-by-side' && <SideBySide {...shared}/>}{current==='swipe' && <SwipeCompare {...shared}/>}{current==='blink' && <BlinkCompare {...shared}/>}{current==='fade' && <CrossfadeCompare {...shared}/>}{['difference','significance'].includes(current) && <DifferenceView key={current} comparisonId={comparison.id} initialMode={current==='significance' ? 'significance' : 'difference'} hasSignificance={Boolean(comparison.significance_path)}/>}
  </div><ScienceDetails title="Comparison measurements"><ChangeSummary comparison={comparison} onSelectCandidate={setCandidate}/>{candidate && <div className="inline-notice" role="status">Selected candidate: {candidate.id}. Coordinates: {candidate.ra.toFixed(4)}°, {candidate.dec.toFixed(4)}°. Score: {candidate.score.toFixed(1)}%. {candidate.metadata_json?.note}</div>}</ScienceDetails></div>;
}
