"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Observation, SkyRegion } from "@/lib/types";

export function useSkyArchive() {
  const [regions,setRegions] = useState<SkyRegion[]>([]);
  const [observations,setObservations] = useState<Observation[]>([]);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string | null>(null);
  const [revision,setRevision] = useState(0);
  useEffect(()=>{
    let active=true;
    async function load() {
      setLoading(true);setError(null);
      try {
        const [fields,first]=await Promise.all([api.getRegions(),api.listObservations({limit:100})]);
        const images=[...first.observations];
        for(let offset=100;offset<first.total;offset+=100) {
          const page=await api.listObservations({limit:100,offset});
          if(!active) return;
          images.push(...page.observations);
        }
        if(active) {setRegions(fields);setObservations(images);}
      } catch(error) {if(active) setError(error instanceof Error ? error.message : "Images could not be loaded.");}
      finally {if(active) setLoading(false);}
    }
    load();return()=>{active=false;};
  },[revision]);
  return {regions,observations,loading,error,retry:()=>setRevision(v=>v+1)};
}
