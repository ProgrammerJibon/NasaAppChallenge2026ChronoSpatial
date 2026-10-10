"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { compatibleEpochs, findEpochPair } from "@/lib/observationPairs";
import { api, ApiError } from "@/lib/api";
import type { Comparison, Observation, SkyRegion } from "@/lib/types";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
import { shortFieldName } from "@/lib/skyFields";
import { CompareWorkspace } from "@/components/compare/CompareWorkspace";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { BeginnerExplainer } from "@/components/ui/BeginnerExplainer";
import { useLanguage } from "@/lib/i18n";
import { formatShortDate, formatWavelength } from "@/lib/format";
import {
  RiContrast2Line,
  RiExchangeLine,
  RiSparklingLine,
  RiCompass3Line,
  RiTimeLine,
  RiEyeLine,
} from "react-icons/ri";

function CompareContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [obsA, setObsA] = useState<Observation | null>(null);
  const [obsB, setObsB] = useState<Observation | null>(null);
  const [allObservations, setAllObservations] = useState<Observation[]>([]);
  const [regions, setRegions] = useState<SkyRegion[]>([]);
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [jobProgress, setJobProgress] = useState<number | null>(null);
  const [details,setDetails]=useState(false);
  const [revision,setRevision]=useState(0);
  const [error, setError] = useState<string | null>(null);

  // Group observations by region
  const regionObservations = useMemo(() => {
    if (!selectedRegionId) return allObservations;
    const filtered = allObservations.filter((o) => o.region_id === selectedRegionId);
    return filtered.length > 0 ? filtered : allObservations;
  }, [allObservations, selectedRegionId]);

  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let releaseDelay: (() => void) | undefined;
    async function init() {
      try {
        setLoading(true); setError(null); setJobProgress(null); setComparison(null);
        const [regList,obsList] = await Promise.all([api.getRegions(),api.listObservations({limit:100})]);
        if (!active) return;
        setRegions(regList); setAllObservations(obsList.observations);
        const id = searchParams.get("id");
        if (id) {
          const comp = await api.getComparison(id);
          if (!active) return;
          setComparison(comp); setObsA(comp.observationA ?? null); setObsB(comp.observationB ?? null);
          setSelectedRegionId(comp.observationA?.region_id ?? null);
          return;
        }
        const a = obsList.observations.find(o => o.id === searchParams.get("a"));
        const b = obsList.observations.find(o => o.id === searchParams.get("b"));
        const defaultRegion = regList.find(r => r.slug === "m31") ?? regList[0];
        const pair = a && b ? [a,b] as [Observation,Observation] : a ? findEpochPair(obsList.observations,a) : findEpochPair(obsList.observations.filter(o => o.region_id === defaultRegion?.id));
        if (!pair) throw new Error("No compatible observation pair is available. Choose a region with repeat observations in the same detector band.");
        if (!compatibleEpochs(pair[0],pair[1])) throw new Error("Choose different observation dates in the same detector band and compatible wavelength range. A wavelength difference can resemble a change over time.");
        setObsA(pair[0]); setObsB(pair[1]); setSelectedRegionId(pair[0].region_id);
        const result = await api.createComparison(pair[0].id,pair[1].id);
        if (!active) return;
        if (result.status === "completed" && result.comparison) {
          setComparison(result.comparison); return;
        }
        if (!result.jobId || !result.comparisonId) throw new Error("The comparison could not be started.");
        for (let attempt=0; attempt<90 && active; attempt++) {
          const job = await api.getJob(result.jobId);
          if (!active) return;
          setJobProgress(job.progress);
          if (job.status === "completed") {
            const comp = await api.getComparison(result.comparisonId);
            if (active) setComparison(comp);
            return;
          }
          if (job.status === "failed" || job.status === "cancelled") throw new Error(job.error || "Comparison processing stopped.");
          await new Promise<void>(resolve => { releaseDelay=resolve; timer=setTimeout(resolve,2000); });
        }
        if (active) throw new Error("Processing is taking longer than expected. Please retry shortly.");
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to load comparison.");
      } finally {
        if (active) { setLoading(false); setJobProgress(null); }
      }
    }
    init();
    return () => { active=false; if(timer) clearTimeout(timer); releaseDelay?.(); };
  },[searchParams,revision]);

  const handleSelectRegion = (regionId: string) => {
    const pair = findEpochPair(allObservations.filter(o => o.region_id === regionId));
    if (pair) router.push(`/compare?a=${pair[0].id}&b=${pair[1].id}`);
    else { setSelectedRegionId(regionId);setComparison(null);setObsA(null);setObsB(null);setError("This field needs two observations with matching wavelengths. Try another field."); }
  };
  const handleSwapEpochs = () => { if(obsA && obsB) router.push(`/compare?a=${obsB.id}&b=${obsA.id}`); };
  const handleChangeEpochA = (id: string) => {
    const next = allObservations.find(o => o.id === id);
    if (!next) return;
    const pair = obsB && compatibleEpochs(next,obsB) ? [next,obsB] : findEpochPair(regionObservations,next);
    if (pair) router.push(`/compare?a=${pair[0].id}&b=${pair[1].id}`);
  };
  const handleChangeEpochB = (id: string) => { if(obsA) router.push(`/compare?a=${obsA.id}&b=${id}`); };

  const chooseRegion = regions.find(r=>r.id===selectedRegionId);
  return <MissionWorkspace title="What changed between these dates?" subtitle="Slide, blink, or blend two observations of the same sky." scene="blackhole" welcome="Let's compare two dates. I've chosen matching bands, so wavelength differences are less likely to mislead you." context={obsA && obsB ? `Band ${obsA.band_number} · ${formatShortDate(obsA.observation_date)} → ${formatShortDate(obsB.observation_date)}` : undefined} topics={[
    {label:"How do I compare?",keywords:["how","compare","start"],answer:"Choose Slide to reveal each image, Blink to alternate them, or Blend to mix them. The dates stay visible above the images."},
    {label:"What do the colors mean?",keywords:["color","red","blue","difference"],answer:"In the change map, red is brighter in the second observation and blue is fainter. Noise or missing pixels can also create differences."},
    {label:"Did we discover something?",keywords:["discover","planet","black hole","confirmed"],answer:"These are possible changes, not discoveries. Follow-up analysis is needed. The animated black hole above is decoration, not observation data."},
    {label:"Show scientific details",keywords:["details","science","significance","sigma"],answer:"Open the scientific views to see the brightness difference and its size relative to estimated noise.",action:()=>setDetails(true)}
  ]}>
    <div className="field-choices" role="group" aria-label="Comparison field">{regions.map(region=><button type="button" key={region.id} aria-pressed={region.id===selectedRegionId} onClick={()=>handleSelectRegion(region.id)}>{shortFieldName(region)}</button>)}</div>
    <div className="pair-selectors"><label>First observation<select aria-label="Epoch A observation" value={obsA?.id??''} disabled={loading} onChange={event=>handleChangeEpochA(event.target.value)}>{regionObservations.filter(o=>o.id===obsA?.id || findEpochPair(regionObservations,o)).map(o=><option key={o.id} value={o.id}>{formatShortDate(o.observation_date)} · Band {o.band_number}</option>)}</select></label><label>Second observation<select aria-label="Epoch B observation" value={obsB?.id??''} disabled={loading} onChange={event=>handleChangeEpochB(event.target.value)}>{regionObservations.filter(o=>o.id===obsB?.id || (obsA && compatibleEpochs(obsA,o))).map(o=><option key={o.id} value={o.id}>{formatShortDate(o.observation_date)} · Band {o.band_number}</option>)}</select></label></div>
    {error ? <ErrorState title="These images could not be compared" message={error} onRetry={()=>{if(searchParams.toString()) router.replace("/compare"); else setRevision(r=>r+1);}} secondaryAction={<Button onClick={()=>router.push('/explore')}>Choose another field</Button>}/> : loading ? <div className="mission-empty" role="status">{jobProgress!==null ? `Preparing the images… ${Math.round(jobProgress)}%` : 'Loading the observation pair…'}</div> : comparison && obsA && obsB ? <>
      {!compatibleEpochs(obsA,obsB) && <p className="inline-notice">This saved example has different bands. Use a matching-band pair before interpreting a change.</p>}
      <CompareWorkspace comparison={comparison} obsA={obsA} obsB={obsB} showScience={details}/>
    </> : <div className="mission-empty">Choose a sky field to begin.</div>}
    <ScienceDetails title="Scientific views & method" open={details} onToggle={setDetails}><p>The worker aligns the images using sky coordinates, subtracts estimated backgrounds, and calculates brightness differences. The significance map compares those differences with estimated noise.</p><p>Field: {chooseRegion?.name??'Not selected'}. Compatible pairs require the same detector band, different dates, and central wavelengths within 2%.</p><button type="button" className="text-link" onClick={handleSwapEpochs}>Reverse the observation order ↔</button></ScienceDetails>
  </MissionWorkspace>;
}

export default function ComparePage() {
  return (
    <Suspense fallback={<Skeleton className="w-full h-96 rounded-3xl" />}>
      <CompareContent />
    </Suspense>
  );
}
