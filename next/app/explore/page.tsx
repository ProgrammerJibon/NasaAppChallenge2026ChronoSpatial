"use client";
import { Suspense, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { RiArrowRightLine, RiSearchLine } from "react-icons/ri";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
import { useSkyArchive } from "@/hooks/useSkyArchive";
import { SkyImageViewer } from "@/components/sky/SkyImageViewer";
import { ObservationStrip } from "@/components/sky/ObservationStrip";
import { MetadataPanel } from "@/components/sky/MetadataPanel";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { api } from "@/lib/api";
import { parseCoordinates } from "@/lib/coordinates";
import { findEpochPair } from "@/lib/observationPairs";
import { shortFieldName, matchSkyField } from "@/lib/skyFields";
import { formatShortDate } from "@/lib/format";
import type { Observation, SkyRegion } from "@/lib/types";
function ExploreContent() {
  const archive=useSkyArchive(), params=useSearchParams();
  const searchRequest=useRef(0);
  const [slug,setSlug]=useState(params.get("region")??"m31"), [band,setBand]=useState<number|null>(null);
  const [selectedId,setSelectedId]=useState(params.get("obs")), [query,setQuery]=useState("");
  const [notice,setNotice]=useState<string|null>(null), [searching,setSearching]=useState(false);
  const [custom,setCustom]=useState<Observation[]|null>(null), [details,setDetails]=useState(false);
  useEffect(()=>{setSlug(params.get("region")??"m31");setSelectedId(params.get("obs"));setBand(null);setCustom(null);},[params]);
  const region=archive.regions.find(r=>r.slug===slug)??archive.regions[0];
  const fieldImages=custom??archive.observations.filter(o=>o.region_id===region?.id);
  const images=fieldImages.filter(o=>band===null || o.band_number===band);
  const current=images.find(o=>o.id===selectedId)??images[0];
  const pair=current ? findEpochPair(fieldImages,current) : null;
  const chooseField=(field:SkyRegion)=>{searchRequest.current++;setSearching(false);setSlug(field.slug);setBand(null);setSelectedId(null);setCustom(null);setNotice(null);};
  const search=async()=>{
    const field=matchSkyField(query,archive.regions);
    if(field) {chooseField(field);setNotice(`Here are the images of ${shortFieldName(field)}.`);return;}
    const coordinates=parseCoordinates(query);
    if(!coordinates.isValid) {setNotice("Try a field above, or enter RA and Dec as two numbers.");return;}
    const requestId=++searchRequest.current;setSearching(true);
    try {
      const result=await api.searchObservations({ra:coordinates.ra,dec:coordinates.dec,radiusDeg:.25});
      if(searchRequest.current!==requestId) return;
      if(result.status==="cached" && result.observations?.length) {setCustom(result.observations);setBand(null);setSelectedId(null);setNotice(`${result.observations.length} images found.`);}
      else setNotice("No images are available here yet. Choose a field above to explore the local archive.");
    } catch {if(searchRequest.current===requestId) setNotice("Search is unavailable. You can still choose a field above.");}
    finally {if(searchRequest.current===requestId) setSearching(false);}
  };
  const fieldLabel=custom ? "Coordinate search" : region ? shortFieldName(region) : "Loading sky…";
  const topics=[...archive.regions.map((field,i)=>({hidden:i>=3,label:`Show ${shortFieldName(field)}`,keywords:[shortFieldName(field),field.slug,...(field.slug==="m31" ? ["m31","andromeda"] : field.slug==="pleiades" ? ["m45"] : field.slug==="orion" ? ["m42"] : [])],answer:`Let's look at ${shortFieldName(field)}. Choose a date below the image to see another observation.`,action:()=>chooseField(field)})),
    {label:"What am I seeing?",keywords:["seeing","image","black","infrared"],answer:"An infrared observation, shown in grayscale. Bright areas are stronger signals. Black areas can be masked or missing pixels; they do not prove a black hole."},
    {label:"Show image details",keywords:["details","science","wavelength","coordinates","band"],answer:"I've opened the image details. A band is a range of infrared wavelengths. Compare matching bands across dates.",action:()=>setDetails(true)}];
  return <MissionWorkspace title="Where shall we look?" subtitle="Choose a place. Explore a real image of the sky." scene="planet" welcome="Hi, explorer. Pick a sky field and I'll help you understand the images." context={current ? `${fieldLabel} · ${images.length} images` : undefined} topics={topics}>
    <div className="field-choices" role="group" aria-label="Choose a sky field">{archive.regions.map(field=><button key={field.id} type="button" aria-pressed={!custom && region?.id===field.id} onClick={()=>chooseField(field)}>{shortFieldName(field)}</button>)}</div>
    <form className="mission-search" onSubmit={event=>{event.preventDefault();search();}}><RiSearchLine/><input aria-label="Find a sky field" placeholder="Try Orion, M31 or coordinates" value={query} onChange={event=>setQuery(event.target.value)}/><button disabled={searching||!query.trim()}>{searching ? "Finding…" : "Find"}</button></form>
    {notice && <p className="inline-notice" role="status">{notice}</p>}
    {archive.error ? <ErrorState title="Images could not load" message="Try loading the archive again." onRetry={archive.retry}/> : archive.loading ? <Skeleton className="h-[420px] rounded-2xl"/> : current ? <>
      <div className="observation-stage"><div className="stage-heading"><strong>{fieldLabel}</strong><span>{formatShortDate(current.observation_date)} · Band {current.band_number}</span></div><SkyImageViewer key={current.id} observationId={current.id} alt={`Observation ${current.archive_id}`} ra={current.ra} dec={current.dec} className="guided-sky-viewer"/><div className="stage-caption">Infrared image · black areas may contain no valid data</div></div>
      <div className="observation-rail"><span className="small-label">Choose an observation</span><ObservationStrip observations={images} selectedId={current.id} onSelect={image=>setSelectedId(image.id)}/></div>
      <div className="next-actions"><Link href={`/timeline?region=${region?.slug??"m31"}`} className="secondary-link">Watch the dates change<RiArrowRightLine/></Link>{pair && <Link className="primary-link" href={`/compare?a=${pair[0].id}&b=${pair[1].id}`}>Compare two dates<RiArrowRightLine/></Link>}</div>
    </> : <div className="mission-empty">No images in this band. Try another wavelength or sky field.</div>}
    <ScienceDetails title="Image details & wavelength" open={details} onToggle={setDetails}><label className="simple-select">Infrared band<select aria-label="Filter infrared band" value={band??"all"} onChange={event=>{setBand(event.target.value==="all" ? null : Number(event.target.value));setSelectedId(null);}}><option value="all">All available bands</option>{Array.from(new Set(fieldImages.map(o=>o.band_number))).sort().map(value=><option key={value} value={value}>Band {value}</option>)}</select></label>{current && <MetadataPanel observation={current}/>}</ScienceDetails>
  </MissionWorkspace>;
}
export default function ExplorePage() {return <Suspense fallback={<Skeleton className="h-96 rounded-2xl"/>}><ExploreContent/></Suspense>;}
