"use client";
import type { Comparison, Observation } from "@/lib/types";
import { SideBySide } from "./SideBySide";
import { SwipeCompare } from "./SwipeCompare";
import { BlinkCompare } from "./BlinkCompare";
import { CrossfadeCompare } from "./CrossfadeCompare";
import { DifferenceView } from "./DifferenceView";
import { ExampleMapView } from "./ExampleMapView";
import { api } from "@/lib/api";
import { useState } from "react";
export function CompareWorkspace({comparison,obsA,obsB}:{comparison?:Comparison|null;obsA:Observation;obsB:Observation}) {
  const [mode,setMode]=useState('swipe');
  const current=mode;
  const mapMode=current==='difference' || current==='significance';
  const hasSelectedMap=Boolean(comparison && (current==='difference' ? comparison.difference_path : comparison.significance_path));
  const alignedA=comparison?.aligned_a_path ? api.getComparisonFileUrl(comparison.id,'aligned-a') : undefined;
  const alignedB=comparison?.aligned_b_path ? api.getComparisonFileUrl(comparison.id,'aligned-b') : undefined;
  const shared={obsA,obsB,alignedSrcA:alignedA,alignedSrcB:alignedB};
  const modes=[['swipe','Slide'],['blink','Blink'],['fade','Blend'],['side-by-side','Side by side'],['difference','Change map'],['significance','Noise check']];
  const hints:Record<string,string>={swipe:'Drag the divider to reveal the first or second image.',blink:'Press play to alternate between the two dates.',fade:'Move the slider to blend the two observations.','side-by-side':'Two dates, next to each other.',difference:'Red means brighter in the second image; blue means fainter.',significance:'A larger signal here means the change is stronger relative to estimated noise.'};
  return <div className="space-y-4"><div className="compare-mode-bar" role="group" aria-label="Comparison view">{modes.map(([id,label])=>{const example=(id==='difference' && !comparison?.difference_path) || (id==='significance' && !comparison?.significance_path);return <button type="button" key={id} aria-pressed={current===id} title={example ? 'Open an illustrative example; the selected pair cannot produce a scientific map' : hints[id]} onClick={()=>setMode(id)}>{label}</button>;})}</div><div className={`compare-stage compare-stage-${current}`}>
    {current==='side-by-side' && <SideBySide {...shared}/>}
    {current==='swipe' && <SwipeCompare {...shared}/>}
    {current==='blink' && <BlinkCompare {...shared}/>}
    {current==='fade' && <CrossfadeCompare {...shared}/>}
    {mapMode && hasSelectedMap && comparison && <DifferenceView key={current} comparisonId={comparison.id} initialMode={current === 'difference' ? 'difference' : 'significance'} hasSignificance={Boolean(comparison.significance_path)}/>}
    {mapMode && !hasSelectedMap && <ExampleMapView kind={current === 'difference' ? 'difference' : 'significance'}/>}
  </div></div>;
}
