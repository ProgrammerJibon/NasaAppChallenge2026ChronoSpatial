"use client";
import { useState } from "react";
const choices=[['Moving object','It moved','Position changed'],['Brightness changed','It got brighter or fainter','Same place, different brightness'],['Appeared/disappeared','It appeared or vanished','Visible in only one image'],['Likely artefact/noise','It looks like noise','An image artifact'],['Unsure','I am not sure','That is okay, too']];
export function ReviewActions({onSubmit,onNext,submitting=false}:{onSubmit:(classification:string,confidence:number)=>Promise<void>;onNext:()=>void;submitting?:boolean}) {
  const [selected,setSelected]=useState<string|null>(null),[confidence,setConfidence]=useState(.7),[submitted,setSubmitted]=useState(false),[error,setError]=useState<string|null>(null);
  const submit=async()=>{if(!selected || submitted || submitting)return;setError(null);try{await onSubmit(selected,confidence);setSubmitted(true);}catch{setError('Your answer was not saved. Please try again.');}};
  return <div className="review-choice-panel"><h2>What do you notice?</h2><p>Choose what best describes the two images.</p><div className="review-choices">{choices.map(([value,label,help])=><button type="button" key={value} aria-pressed={selected===value} disabled={submitted||submitting} onClick={()=>setSelected(value)}><strong>{label}</strong><small>{help}</small></button>)}</div>
    <label className="review-confidence">How sure are you?<span>{Math.round(confidence*100)}%</span><input aria-label="Review confidence" type="range" min={.1} max={1} step={.1} value={confidence} disabled={submitted||submitting} onChange={event=>setConfidence(Number(event.target.value))}/></label>
    {error && <p className="inline-notice" role="alert">{error}</p>}{submitted ? <div className="review-success" role="status">Answer saved. Thank you!<button type="button" onClick={onNext}>Next example →</button></div> : <div className="next-actions"><button type="button" className="primary-link" disabled={!selected||submitting} onClick={submit}>{submitting ? 'Saving…' : 'Save my answer'}</button><button type="button" className="secondary-link" disabled={submitting} onClick={onNext}>Skip this one</button></div>}
  </div>;
}
