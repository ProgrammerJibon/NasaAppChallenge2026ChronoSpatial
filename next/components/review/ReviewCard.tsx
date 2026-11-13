"use client";
import { useState } from "react";
import { BlinkCompare } from "@/components/compare/BlinkCompare";
import { SkyImage } from "@/components/sky/SkyImage";
import { ScienceDetails } from "@/components/mission/MissionWorkspace";
import { api } from "@/lib/api";
import { ExampleMapView } from "@/components/compare/ExampleMapView";
import type { ReviewItem } from "@/lib/types";
export function ReviewCard({item,practice=false}:{item:ReviewItem;practice?:boolean}) {
  const [view,setView]=useState('blink');
  const comparison=item.comparison, candidate=item.candidate;
  const a=comparison?.observationA,b=comparison?.observationB;
  return <section className="review-image-panel" aria-label="Observation images"><div className="compare-mode-bar"><button type="button" aria-pressed={view==='blink'} onClick={()=>setView('blink')}>Blink between dates</button><button type="button" aria-pressed={view==='difference'} onClick={()=>setView('difference')}>{practice ? 'Example change map' : 'Show change map'}</button></div><div className="compare-stage">{view==='blink' && a && b ? <BlinkCompare obsA={a} obsB={b} alignedSrcA={!practice && comparison?.aligned_a_path ? api.getComparisonFileUrl(comparison.id,'aligned-a') : undefined} alignedSrcB={!practice && comparison?.aligned_b_path ? api.getComparisonFileUrl(comparison.id,'aligned-b') : undefined}/> : practice ? <ExampleMapView kind="difference"/> : <div className="review-difference"><SkyImage src={api.getComparisonFileUrl(item.comparisonId,'difference')} alt="Difference map from aligned observations" className="w-full h-full"/></div>}</div><p className="review-image-caption">{practice ? 'Source images are real SPHEREx cutouts; the map is a separate simulated example.' : 'Observations and map show the selected pair. A visual difference is a clue, not a confirmed discovery.'}</p><ScienceDetails title="Image and candidate details">{candidate && <dl className="review-measurements"><div><dt>Example ID</dt><dd>{candidate.id}</dd></div><div><dt>Coordinates</dt><dd>{candidate.ra.toFixed(4)}°, {candidate.dec.toFixed(4)}°</dd></div><div><dt>Example detection score</dt><dd>{candidate.score.toFixed(1)}%</dd></div><div><dt>Displacement</dt><dd>{candidate.motion_arcsec} arcseconds</dd></div><div><dt>Brightness difference</dt><dd>{candidate.brightness_change}</dd></div></dl>}</ScienceDetails></section>;
}
