"use client";
import type { SkyRegion } from "@/lib/types";
export interface RegionSelectorProps {regions: SkyRegion[];selectedSlug?: string;onSelect: (region: SkyRegion) => void;}
export function RegionSelector({regions,selectedSlug,onSelect}:RegionSelectorProps) {
  return <div className="flex flex-wrap gap-2" role="group" aria-label="Sky region">{regions.map(region => <button key={region.id} type="button" onClick={() => onSelect(region)} aria-pressed={region.slug === selectedSlug || region.id === selectedSlug} className="selection-chip">{region.name}</button>)}</div>;
}
