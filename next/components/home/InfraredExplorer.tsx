"use client";
import { useState } from "react";
import Link from "next/link";
import type { Observation, SkyRegion } from "@/lib/types";
export function InfraredExplorer({observations,regions}:{observations:Observation[];regions:SkyRegion[]}) {
  const [value,setValue]=useState(1.5);
  const infrared=value>=.75;
  const match=observations.find(o=>o.wavelength_min_um<=value && o.wavelength_max_um>=value);
  const region=regions.find(r=>r.id===match?.region_id);
  return <section className="home-spectrum home-section" aria-labelledby="infrared-title">
    <div><span className="eyebrow">02 / BEYOND OUR EYES</span><h2 id="infrared-title">There’s more to light<br/>than we can see.</h2><p>Move through the spectrum. Discover the light a sky survey can record.</p><span className="home-annotation">Conceptual illustration · not a measured spectrum</span></div>
    <div className="spectrum-console"><div className="spectrum-readout"><span>{infrared ? 'INFRARED' : 'VISIBLE LIGHT'}</span><strong>{value.toFixed(2)} <small>µm</small></strong></div>
      <svg viewBox="0 0 500 115" className="spectrum-wave" role="img" aria-label={'Illustration of light at '+value.toFixed(2)+' micrometers'}><path d={Array.from({length:251},(_,i)=>(i?'L':'M')+(i*2)+','+(57+Math.sin(i/(3+value*5))*32).toFixed(3)).join(' ')} fill="none" stroke={infrared?'#d4b8ff':'#90e3ec'} strokeWidth="2"/><path d="M0 57H500" stroke="#b1baff22"/></svg>
      <div className="spectrum-track"><span>Visible</span><span>Infrared →</span></div><label className="spectrum-slider">Wavelength<input aria-label="Explore wavelength" type="range" min="0.4" max="5" step="0.05" value={value} onChange={e=>setValue(Number(e.target.value))}/></label><div className="spectrum-scale"><span>0.4 µm</span><span>5.0 µm</span></div>
      <p aria-live="polite">{infrared?'This light is beyond human vision. Infrared observations help study stars, galaxies, and dust.':'Our eyes see this part of the spectrum. SPHEREx observes longer wavelengths, starting near 0.75 µm.'}</p>
      {match && region ? <Link href={'/explore?region='+region.slug+'&obs='+match.id} className="text-link">See an archive image covering this wavelength ↗</Link> : <span className="home-annotation">No matching image in this local archive.</span>}
      <details className="home-source"><summary>Wavelength details</summary><p>SPHEREx covers approximately 0.75–5.0 µm. This slider is continuous; the archive contains discrete observations with their own wavelength ranges. The boundary here is simplified for explanation.</p><a href="https://spherex.caltech.edu/" target="_blank" rel="noreferrer">SPHEREx mission source ↗</a></details>
    </div>
  </section>;
}
