"use client";
import type { Observation, SkyRegion } from "@/lib/types";
import { shortFieldName } from "@/lib/skyFields";
import { SkyImage } from "./SkyImage";
export function FieldGallery({ regions, observations, selectedId, onSelect }: {regions:SkyRegion[];observations:Observation[];selectedId?:string;onSelect:(region:SkyRegion)=>void}) {
  return <div className="field-gallery" role="group" aria-label="Choose a sky field">{regions.map(region=>{
    const images=observations.filter(o=>o.region_id===region.id);
    return <button type="button" className="field-tile" key={region.id} aria-pressed={selectedId===region.id} onClick={()=>onSelect(region)}>
      <div className="field-preview">{images[0] ? <SkyImage observationId={images[0].id} alt={`${shortFieldName(region)} archive preview`} className="w-full h-full"/> : <span>No preview yet</span>}</div>
      <span className="field-tile-label"><strong>{shortFieldName(region)}</strong><small>{images.length} images <span aria-hidden="true">↗</span></small></span>
    </button>;
  })}</div>;
}
