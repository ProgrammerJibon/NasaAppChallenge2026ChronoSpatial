"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
import { ReviewCard } from "@/components/review/ReviewCard";
import { ReviewActions } from "@/components/review/ReviewActions";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { api, ApiError } from "@/lib/api";
import type { ReviewItem, ReviewStats } from "@/lib/types";
export default function ReviewPage() {
  const [item,setItem]=useState<ReviewItem|null>(null),[stats,setStats]=useState<ReviewStats|null>(null),[loading,setLoading]=useState(true),[submitting,setSubmitting]=useState(false),[error,setError]=useState<string|null>(null);
  const excluded=useRef<string[]>([]), visitor=useRef(''), request=useRef(0);
  const visitorId=()=>{
    if(visitor.current) return visitor.current;
    try {visitor.current=localStorage.getItem('spx_visitor_id')??'';} catch {}
    if(!visitor.current) {visitor.current='v_'+crypto.randomUUID();try{localStorage.setItem('spx_visitor_id',visitor.current);}catch{}}
    return visitor.current;
  };
  const loadNext=useCallback(async()=>{
    const currentRequest=++request.current;setLoading(true);setError(null);setStats(null);
    try {
      const next=await api.getNextReview(visitorId(),excluded.current);
      if(request.current!==currentRequest) return;
      if(next.candidateId && excluded.current.includes(next.candidateId)) {setItem(null);return;}
      setItem(next);
      const summary=await api.getReviewStats(next.comparisonId).catch(()=>null);
      if(request.current===currentRequest) setStats(summary);
    } catch(error) {
      if(request.current!==currentRequest) return;
      if(error instanceof ApiError && error.code==='NO_REVIEW_ITEMS') setItem(null);
      else setError('The review examples could not load. Please try again.');
    } finally {if(request.current===currentRequest) setLoading(false);}
  },[]);
  useEffect(()=>{loadNext();return()=>{request.current++;};},[loadNext]);
  const next=()=>{if(item?.candidateId) excluded.current=[...excluded.current,item.candidateId];loadNext();};
  const submit=async(classification:string,confidence:number)=>{
    if(!item) throw new Error('No example selected');
    setSubmitting(true);
    try {
      await api.submitReview({comparisonId:item.comparisonId,candidateId:item.candidateId,visitorHash:visitorId(),classification,confidence});
      const summary=await api.getReviewStats(item.comparisonId).catch(()=>null);
      if(summary) setStats(summary);
    } finally {setSubmitting(false);}
  };
  return <MissionWorkspace title="A second pair of eyes." subtitle="Look at two images. Tell us what you notice." scene="ship" welcome="You don't need to be an astronomer. Look for a change, then choose the description that fits best." context={`Example ${excluded.current.length+1} · no account needed`} topics={[
    {label:'What should I look for?',keywords:['look','notice','start'],answer:'A point that shifts position, changes brightness, appears, or disappears. Press play to switch between the images.'},
    {label:'What if I am unsure?',keywords:['unsure','sure','uncertain'],answer:'Choose “I am not sure.” It is better to be honest than to guess.'},
    {label:'Is a vote a discovery?',keywords:['vote','discovery','confirmed'],answer:'No. Votes are assessments of possible changes. Detector noise and image artifacts need to be checked before any scientific conclusion.'},
    {label:'How does privacy work?',keywords:['privacy','account','login'],answer:'The review uses a random visitor identifier saved in your browser, not your name or email.'}
  ]}>
    {error ? <ErrorState title="Review is unavailable" message={error} onRetry={loadNext}/> : loading ? <Skeleton className="h-[400px] rounded-2xl"/> : item ? <><ReviewCard key={item.candidateId??item.comparisonId} item={item}/><ReviewActions key={`actions-${item.candidateId??item.comparisonId}`} onSubmit={submit} onNext={next} submitting={submitting}/></> : <div className="mission-empty">You have reached the end of the available examples. Thank you for exploring.</div>}
    {stats && <ScienceDetails title={`Community answers · ${stats.totalReviews} reviews`}><div className="community-bars">{Object.entries(stats.classifications).map(([classification,count])=><div key={classification}><span>{classification}</span><strong>{count}</strong><i style={{width:`${stats.totalReviews ? count/stats.totalReviews*100 : 0}%`}}/></div>)}</div></ScienceDetails>}
  </MissionWorkspace>;
}
