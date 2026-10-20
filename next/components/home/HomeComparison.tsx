"use client";

import { useState } from "react";
import Link from "next/link";
import type { Observation } from "@/lib/types";
import { SwipeCompare } from "@/components/compare/SwipeCompare";
import { BlinkCompare } from "@/components/compare/BlinkCompare";
import { SkyImage } from "@/components/sky/SkyImage";
import { formatShortDate, formatWavelength } from "@/lib/format";

export function HomeComparison({ pair, fieldName }: { pair: [Observation, Observation]; fieldName: string }) {
  const [mode, setMode] = useState<"slide" | "blink">("slide");
  const [step, setStep] = useState(0);
  const [a, b] = pair;
  const comparisonUrl = `/compare?a=${a.id}&b=${b.id}`;
  const steps = [
    { label: "Observe", title: "Start with the first observation", copy: `This infrared image of ${fieldName} was recorded on ${formatShortDate(a.observation_date)}. Look for bright points and the shape of the background.`, mode: "slide" as const },
    { label: "Revisit", title: "Return to the same sky field", copy: `The second image was recorded on ${formatShortDate(b.observation_date)} in the same detector band. Dates and wavelength matter: compare like with like.`, mode: "slide" as const },
    { label: "Compare", title: "Look for a change", copy: "Drag the divider or blink between dates. A point that appears to move or brighten is a reason to investigate, not yet a discovery.", mode: "blink" as const },
    { label: "Verify", title: "Check the evidence", copy: "These are archive previews. Image alignment, noise, missing pixels, and artifacts must be checked in the full comparison before drawing a conclusion.", mode: "slide" as const },
  ];
  const current = steps[step];

  function selectStep(index: number) {
    setStep(index);
    setMode(steps[index].mode);
  }

  return <div className="home-comparison">
    <div className="home-comparison-toolbar">
      <div className="home-comparison-intro">
        <span className="eyebrow"><i /> REAL ARCHIVE OBSERVATIONS</span>
        <p>One field. Two moments.</p>
      </div>
      <div className="home-view-buttons" role="group" aria-label="Homepage comparison mode">
        <button type="button" aria-pressed={step >= 2 && mode === "slide"} onClick={() => { setStep(2); setMode("slide"); }}>Drag to reveal</button>
        <button type="button" aria-pressed={step >= 2 && mode === "blink"} onClick={() => { setStep(2); setMode("blink"); }}>Blink images</button>
      </div>
    </div>

    <div className="discovery-guide" aria-label="Guided discovery">
      <div className="discovery-guide-copy" aria-live="polite"><span className="eyebrow">GUIDED DISCOVERY · {String(step + 1).padStart(2, "0")} / 04</span><h3>{current.title}</h3><p>{current.copy}</p></div>
      <div className="discovery-guide-actions"><button type="button" disabled={step === 0} onClick={() => selectStep(step - 1)}>← Back</button><button type="button" onClick={() => selectStep((step + 1) % steps.length)}>{step === steps.length - 1 ? "Start again" : "Next step →"}</button></div>
      <div className="discovery-guide-steps" role="group" aria-label="Discovery steps">{steps.map((item, index) => <button key={item.label} type="button" aria-current={step === index ? "step" : undefined} onClick={() => selectStep(index)}><span>{String(index + 1).padStart(2, "0")}</span>{item.label}</button>)}</div>
    </div>

    <div className="home-comparison-stage">
      <div className="home-comparison-stage-heading" aria-hidden="true"><span>SPHEREx / INFRARED SKY</span><span>{fieldName.toUpperCase()}</span></div>
      <div className="home-comparison-image">
        {step < 2 ? <div className="discovery-single-image"><SkyImage observationId={step === 0 ? a.id : b.id} alt={`${fieldName} infrared observation on ${formatShortDate(step === 0 ? a.observation_date : b.observation_date)}`} className="w-full h-full"/><span>{step === 0 ? "FIRST OBSERVATION" : "SECOND OBSERVATION"} · {formatShortDate(step === 0 ? a.observation_date : b.observation_date)}</span></div> : mode === "slide" ? <SwipeCompare obsA={a} obsB={b} introReveal /> : <BlinkCompare obsA={a} obsB={b} />}
      </div>
      <div className="home-comparison-stage-footer"><span>{step < 2 ? "ONE OBSERVATION AT A TIME" : mode === "slide" ? "← DRAG THE DIVIDER TO REVEAL →" : "TWO DATES / ONE FIELD"}</span><span>ARCHIVE IMAGE PREVIEWS</span></div>
    </div>

    <div className="home-comparison-data" aria-label="Observation details">
      <div><span>FIRST OBSERVATION</span><strong>{formatShortDate(a.observation_date)}</strong>{a.archive_url && <a href={a.archive_url} target="_blank" rel="noreferrer">View source ↗</a>}</div>
      <div className="home-comparison-data-middle"><span>THE SAME FIELD, REVISITED</span><span className="home-comparison-data-line" aria-hidden="true"><i /><i /></span><strong>Band {a.band_number} · {formatWavelength(a.wavelength_min_um, a.wavelength_max_um)}</strong></div>
      <div><span>SECOND OBSERVATION</span><strong>{formatShortDate(b.observation_date)}</strong>{b.archive_url && <a href={b.archive_url} target="_blank" rel="noreferrer">View source ↗</a>}</div>
    </div>

    <div className="home-comparison-caption">
      <div><span className="eyebrow">WHAT CHANGED?</span><p>Look for a clue, then check it carefully. Preview images can be offset or noisy; the full comparison aligns them for closer inspection.</p></div>
      <Link className="primary-link" href={comparisonUrl}>Investigate these images ↗</Link>
    </div>
    <details className="home-source"><summary>How do we know? Observation sources and limits</summary><p>Matching detector band {a.band_number}, {formatWavelength(a.wavelength_min_um, a.wavelength_max_um)}. A visual difference is not a confirmed discovery until alignment, noise, and image artifacts are checked.</p><p>First: {a.archive_id} · {formatShortDate(a.observation_date)} · RA {a.ra.toFixed(3)}°, Dec {a.dec.toFixed(3)}°</p><p>Second: {b.archive_id} · {formatShortDate(b.observation_date)} · RA {b.ra.toFixed(3)}°, Dec {b.dec.toFixed(3)}°</p><p>Archive previews are for visual exploration. Use the full comparison for aligned images and measurements.</p></details>
  </div>;
}
