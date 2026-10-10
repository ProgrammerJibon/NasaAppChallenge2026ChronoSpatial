"use client";
import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
import { TimelinePlayer } from "@/components/timeline/TimelinePlayer";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { useSkyArchive } from "@/hooks/useSkyArchive";
import { findEpochPair } from "@/lib/observationPairs";
import { shortFieldName } from "@/lib/skyFields";
import { formatWavelength } from "@/lib/format";
function TimelineContent() {
  const archive=useSkyArchive(), params=useSearchParams();
  const [slug,setSlug]=useState(params.get('region')??'m31'), [requestedBand,setRequestedBand]=useState<number|null>(null), [details,setDetails]=useState(false);
  useEffect(()=>{setSlug(params.get('region')??'m31');setRequestedBand(null);},[params]);
  const region=archive.regions.find(r=>r.slug===slug)??archive.regions[0];
  const fieldImages=archive.observations.filter(o=>o.region_id===region?.id);
  const bestPair=findEpochPair(fieldImages);
  const band=requestedBand??bestPair?.[0].band_number??fieldImages[0]?.band_number;
  const images=fieldImages.filter(o=>o.band_number===band);
  const name=region ? shortFieldName(region) : 'this field';
  return <MissionWorkspace title="Let's travel through time." subtitle="Press play to step through the available dates." scene="galaxy" welcome="The same sky can look different on another day. I've chosen a matching infrared band for you." context={images.length ? `${name} · ${images.length} dates · Band ${band}` : undefined} topics={[
    {label:'How do I start?',keywords:['start','play','watch'],answer:'Press play beneath the image, or use the arrows to change one date at a time.'},
    {label:'Why the same band?',keywords:['band','wavelength','same'],answer:'Different wavelengths can change how an object looks. Matching bands makes a time comparison more meaningful.'},
    {label:'Is that real movement?',keywords:['move','movement','change'],answer:'Not necessarily. These previews are not aligned pixel by pixel. Open Compare to inspect aligned images before drawing a conclusion.'},
    {label:'Show scientific details',keywords:['science','details','dates'],answer:'The labels show the actual dates and wavelength range. The interval is not always six months.',action:()=>setDetails(true)}
  ]}>
    <div className="field-choices" role="group" aria-label="Choose timeline field">{archive.regions.map(field=><button type="button" key={field.id} aria-pressed={field.id===region?.id} onClick={()=>{setSlug(field.slug);setRequestedBand(null);}}>{shortFieldName(field)}</button>)}</div>
    {archive.error ? <ErrorState title="The timeline could not load" message="Try loading the archive again." onRetry={archive.retry}/> : archive.loading ? <Skeleton className="h-[420px] rounded-2xl"/> : images.length ? <div className="timeline-simplified"><TimelinePlayer key={`${region?.id}-${band}`} observations={images}/></div> : <div className="mission-empty">No images are available here yet. Try another field.</div>}
    <ScienceDetails open={details} onToggle={setDetails}><label className="simple-select">Infrared band<select aria-label="Timeline infrared band" value={band??''} onChange={event=>setRequestedBand(Number(event.target.value))}>{Array.from(new Set(fieldImages.map(o=>o.band_number))).sort().map(value=><option key={value} value={value}>Band {value}</option>)}</select></label><p>SPHEREx repeats its sky survey about every six months. These images show the dates available in this archive.</p>{images[0] && <p>Wavelength: {formatWavelength(images[0].wavelength_min_um,images[0].wavelength_max_um)}. Visual playback is not astrometric alignment.</p>}</ScienceDetails>
  </MissionWorkspace>;
}
export default function TimelinePage() {return <Suspense fallback={<Skeleton className="h-96 rounded-2xl"/>}><TimelineContent/></Suspense>;}
