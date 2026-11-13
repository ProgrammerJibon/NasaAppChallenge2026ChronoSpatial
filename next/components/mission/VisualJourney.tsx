"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { usePathname } from "next/navigation";
import { RiPauseFill, RiPlayFill, RiArrowRightLine, RiRestartLine } from "react-icons/ri";

const chapters = [
  { title: "Catch invisible light.", short: "Observe", text: "A telescope records infrared light from the sky.", label: "INFRARED LIGHT → TELESCOPE", mode: "observe" },
  { title: "Visit the same sky again.", short: "Revisit", text: "Choose the same wavelength on two different dates.", label: "SAME FIELD · SAME BAND · TWO DATES", mode: "revisit" },
  { title: "Bring the stars together.", short: "Align", text: "Match the sky coordinates before comparing brightness.", label: "ALIGN THE TWO OBSERVATIONS", mode: "align" },
  { title: "A difference is a clue.", short: "Investigate", text: "Check the signal, noise and image artifacts before drawing a conclusion.", label: "POSSIBLE CHANGE → FURTHER ANALYSIS", mode: "difference" },
];
const stars = Array.from({ length: 36 }, (_, i) => ({ x: 32 + (i * 83) % 400, y: 34 + (i * 59) % 180, r: i % 7 === 0 ? 3 : 1.5 }));

export function VisualJourney({ paused }: { paused: boolean }) {
  const path = usePathname();
  const [step, setStep] = useState(path === "/compare" ? 2 : path === "/review" ? 3 : path === "/timeline" ? 1 : 0);
  const [playing, setPlaying] = useState(true);
  const root=useRef<HTMLElement>(null);
  const visible=useInView(root,{amount:.3});
  const reduced=useReducedMotionSafe();
  const [expanded, setExpanded] = useState(true);
  useEffect(() => {
    if (!playing || paused || !expanded || !visible || reduced) return;
    const timer = setTimeout(() => {
      if (step === chapters.length - 1) setPlaying(false);
      else setStep(value => value + 1);
    }, 2700);
    return () => clearTimeout(timer);
  }, [playing, paused, expanded, step, visible, reduced]);
  const chapter = chapters[step];
  return <section ref={root} className={`visual-journey ${expanded ? "" : "journey-collapsed"} ${playing && !paused ? "journey-playing" : ""}`} aria-label="Visual guide to comparing the sky">
    <div className="journey-topline"><span><i /> THE SKY, EXPLAINED VISUALLY</span><button type="button" aria-expanded={expanded} aria-controls="visual-story" onClick={() => setExpanded(v => !v)}>{expanded ? "Hide walkthrough −" : "Show walkthrough +"}</button></div>
    {expanded && <div id="visual-story">
      <div className="journey-theater">
        <div className="journey-narration" key={step}><span className="journey-number">0{step + 1} / 04</span><h2>{chapter.title}</h2><p>{chapter.text}</p><button type="button" className="journey-play" onClick={() => { if (step === 3 && !playing) setStep(0); setPlaying(v => !v); }} disabled={paused || reduced}>{playing && !paused ? <RiPauseFill /> : step === 3 ? <RiRestartLine /> : <RiPlayFill />}{playing && !paused ? "Pause story" : step === 3 ? "Replay story" : "Play the story"}</button></div>
        <div className={`journey-visual journey-${chapter.mode}`}>
          <svg viewBox="0 0 540 270" role="img" aria-label={`Illustration: ${chapter.text}`}>
            <defs><radialGradient id="journey-nebula"><stop stopColor="#8b6cef" stopOpacity=".6"/><stop offset="1" stopColor="#8b6cef" stopOpacity="0"/></radialGradient><linearGradient id="journey-beam"><stop stopColor="#8bdbea" stopOpacity="0"/><stop offset="1" stopColor="#8bdbea" stopOpacity=".45"/></linearGradient></defs>
            <ellipse cx="250" cy="130" rx="230" ry="120" fill="url(#journey-nebula)"/>
            <g className="journey-starfield">{stars.map((s,i)=><circle key={i} cx={s.x} cy={s.y} r={s.r} fill={i % 4 === 0 ? "#a5e6ff" : "#ede9ff"} opacity={.4 + (i % 5) * .12}/>)}</g>
            <g className="journey-telescope"><path d="M50 65 L340 115 L340 170 L50 225Z" fill="url(#journey-beam)"/><g className="photon-trails" stroke="#b8efff" strokeWidth="2"><path d="M130 105h28M180 145h28M115 182h28"/></g><g transform="translate(345 110) rotate(-18)"><path d="M0 0h80v60H0Z" fill="#2c315c" stroke="#c4c5fb" strokeWidth="2"/><ellipse cx="0" cy="30" rx="12" ry="30" fill="#91daeb" opacity=".85"/><path d="M45 60v35m-25 0h50M25 -8v-30h50v30" fill="none" stroke="#a4a5db" strokeWidth="3"/><path d="M80 15h30v30H80" fill="#535583"/></g><text x="377" y="231">TELESCOPE</text></g>
            <g className="journey-frames"><g className="epoch-frame epoch-first"><rect x="75" y="48" width="175" height="163" rx="14"/><g>{stars.slice(0,16).map((s,i)=><circle key={i} cx={92+(s.x%140)} cy={65+(s.y%123)} r={s.r} fill="#c4d4ff"/>)}</g><circle cx="166" cy="133" r="4" fill="#fff"/><text x="127" y="239">DATE A</text></g><g className="epoch-frame epoch-second"><rect x="290" y="48" width="175" height="163" rx="14"/>{stars.slice(0,16).map((s,i)=><circle key={i} cx={307+(s.x%140)} cy={65+(s.y%123)} r={s.r} fill="#b9f2ef"/>)}<circle className="changed-star" cx="381" cy="133" r="8" fill="#b7f6f2"/><circle className="change-ring" cx="381" cy="133" r="22" fill="none" stroke="#bbf8ec" strokeDasharray="4 5"/><text x="342" y="239">DATE B</text></g><path className="alignment-arrow" d="M263 118l-9 9 9 9m12-18 9 9-9 9" fill="none" stroke="#c6baff" strokeWidth="2"/></g>
            <g className="difference-note"><path d="M400 113l60-57" stroke="#b8ede8"/><text x="361" y="35">BRIGHTER HERE?</text></g>
          </svg>
          <span className="journey-diagram-label">{chapter.label}</span><span className="illustration-label">Illustration · not observation data</span>
        </div>
      </div>
      <div className="journey-chapters" role="group" aria-label="Choose an explanation">{chapters.map((item,i)=><button type="button" key={item.mode} aria-pressed={step===i} onClick={()=>{setStep(i);setPlaying(false);}}><span>0{i+1}</span>{item.short}<RiArrowRightLine/>{step===i && <i key={`${step}-${playing}-${paused}`} className="chapter-progress"/>}</button>)}</div>
    </div>}
  </section>;
}
