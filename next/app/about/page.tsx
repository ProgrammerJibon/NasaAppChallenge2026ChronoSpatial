"use client";
import { useState } from "react";
import { RiGlobalLine, RiTimeLine, RiRainbowLine } from "react-icons/ri";
import { MissionWorkspace, ScienceDetails } from "@/components/mission/MissionWorkspace";
export default function AboutPage() {
  const [tab,setTab]=useState('mission');
  const tabs=[['mission','The mission'],['method','How comparisons work'],['data','Data & sources']];
  return <MissionWorkspace title="Meet SPHEREx." subtitle="An infrared view of the whole sky, again and again." scene="galaxy" welcome="Think of SPHEREx as a sky surveyor. It observes light our eyes cannot see, and revisits the sky over time." topics={[
    {label:'Why infrared?',keywords:['infrared','light','eyes'],answer:'Infrared light is invisible to our eyes. It helps scientists study cool objects, dust, and the light from stars and galaxies.'},
    {label:'How often does it return?',keywords:['often','return','months','repeat'],answer:'SPHEREx maps the sky about every six months. A specific pair in this app may be separated by a different interval.'},
    {label:'Explain the comparison',keywords:['compare','comparison','method'],answer:'We align compatible images, estimate their backgrounds, then subtract them to highlight possible brightness changes.',action:()=>setTab('method')},
    {label:'Where does the data come from?',keywords:['data','source','archive'],answer:'The observation archive is NASA/IPAC IRSA. Individual images retain their archive ID and source link.',action:()=>setTab('data')}
  ]}>
    <div className="mission-tabs" role="tablist" aria-label="Mission topics">{tabs.map(([id,label])=><button type="button" role="tab" id={`about-tab-${id}`} aria-controls={`about-panel-${id}`} aria-selected={tab===id} key={id} onClick={()=>setTab(id)}>{label}</button>)}</div>
    <div role="tabpanel" id={`about-panel-${tab}`} aria-labelledby={`about-tab-${tab}`}>
      {tab==='mission' && <><div className="fact-grid"><div className="fact-card"><RiGlobalLine/><strong>Whole sky</strong><p>A survey of stars, galaxies, and other infrared sources.</p></div><div className="fact-card"><RiRainbowLine/><strong>102 colors</strong><p>102 infrared wavelength channels reveal different information.</p></div><div className="fact-card"><RiTimeLine/><strong>~6 months</strong><p>The approximate interval between all-sky surveys.</p></div></div><div className="mission-copy-card mt-5"><h2>Why compare dates?</h2><p>Some objects move. Others get brighter or fainter. Repeat observations help us look for those changes.</p></div></>}
      {tab==='method' && <div className="method-steps">{[['01','Match the images','Choose the same field, compatible wavelengths, and different dates.'],['02','Align the sky','Place the second image onto the first image’s sky-coordinate grid.'],['03','Look for a difference','Compare brightness, then check whether the difference is stronger than estimated noise.']].map(([number,title,text])=><div key={number}><span>{number}</span><div><h2>{title}</h2><p>{text}</p></div></div>)}</div>}
      {tab==='data' && <div className="source-links"><a href="https://irsa.ipac.caltech.edu/" target="_blank" rel="noreferrer"><strong>NASA/IPAC IRSA ↗</strong><span>The observation archive</span></a><a href="https://spherex.caltech.edu/" target="_blank" rel="noreferrer"><strong>SPHEREx mission ↗</strong><span>Official mission information</span></a><a href="https://www.spaceappschallenge.org/" target="_blank" rel="noreferrer"><strong>NASA Space Apps ↗</strong><span>The challenge behind this project</span></a></div>}
    </div>
    <ScienceDetails title="The science, in more detail"><p>SPHEREx observes roughly 0.75–5.0 µm using six detector arrays with linear variable filters. Its 102 spectral channels are reconstructed across observations; they are not 102 separate full-sky image files.</p><p>The worker uses WCS coordinates and bilinear interpolation, sigma-clipped background estimates, and a brightness difference divided by propagated uncertainty. Where variance is missing, the worker estimates background noise.</p><p>The interface selects pairs with central wavelengths within 2%. This is an observation-level check, not a full pixel-level wavelength calibration.</p><p>Artifacts, masks, and resampling can mimic changes. A candidate requires further analysis before confirmation.</p></ScienceDetails>
  </MissionWorkspace>;
}
