"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import { RiArrowLeftLine, RiArrowRightLine, RiPauseLine, RiPlayLine } from "react-icons/ri";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";
import { SkyImage } from "@/components/sky/SkyImage";
import { formatShortDate, formatWavelength } from "@/lib/format";
import type { Observation } from "@/lib/types";

const chapters = [
  { label: "01 / THE LIGHT", title: "Follow a signal across space.", copy: "Infrared light travels from the sky toward a telescope. This scene is an illustration of that journey.", name: "Light" },
  { label: "02 / THE TELESCOPE", title: "A telescope catches the light.", copy: "SPHEREx records where it looked, when it looked, and which infrared wavelengths it measured.", name: "Observe" },
  { label: "03 / THE EVIDENCE", title: "Now look at the real sky.", copy: "The journey ends with an actual archive image. Its date and wavelength are evidence you can inspect.", name: "Data" },
];
const stars = Array.from({ length: 52 }, (_, i) => ({
  left: `${(i * 71 + (i % 4) * 19) % 100}%`,
  top: `${(i * 37 + (i % 7) * 13) % 100}%`,
  opacity: .25 + (i % 5) * .12,
}));

export function CosmicSequence({ observation, paused }: { observation?: Observation; paused: boolean }) {
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(true);
  const reduced = useReducedMotionSafe();
  const root = useRef<HTMLElement>(null);
  const visible = useInView(root, { amount: .25 });

  useEffect(() => {
    if (!playing || paused || reduced || !visible || active === chapters.length - 1) return;
    const timer = setTimeout(() => setActive(index => index + 1), 3200);
    return () => clearTimeout(timer);
  }, [playing, paused, reduced, visible, active]);
  useEffect(() => { if (active === chapters.length - 1) setPlaying(false); }, [active]);
  const choose = (index: number) => { setActive(index); setPlaying(false); };
  const cameraTransition = reduced ? { duration: 0 } : { duration: 2.1, ease: [ .22, 1, .36, 1 ] as const };

  return <section id="light-story" ref={root} className="flight-journey home-motion" aria-label="A continuous journey from cosmic light to observation data">
    <div className="flight-heading"><span className="eyebrow">FOLLOW THE LIGHT</span><span>ONE JOURNEY · THREE DESTINATIONS</span></div>
    <div className="flight-window">
      <motion.div className="flight-world" initial={false} animate={{ x: `${-active * 100 / 3}%` }} transition={cameraTransition}>
        <div className="flight-stars">{stars.map((style, i) => <i key={i} style={style} />)}</div>
        <div className="flight-route" />
        <div className="flight-location flight-origin"><div className="flight-galaxy"><i /><i /><i /></div><span className="flight-place">COSMIC LIGHT</span></div>
        <div className="flight-location flight-observatory"><div className="flight-beam" /><div className="flight-telescope"><span className="flight-lens" /><span className="flight-body" /><span className="flight-panel panel-one" /><span className="flight-panel panel-two" /></div><span className="flight-place">INFRARED OBSERVATION</span></div>
        <div className="flight-location flight-archive"><div className="flight-data-visual">{observation ? <><div className="flight-data-label">REAL SPHEREx ARCHIVE IMAGE · BAND {observation.band_number}</div><SkyImage observationId={observation.id} alt={`Infrared archive observation from ${formatShortDate(observation.observation_date)}`} className="flight-real-image" /><div className="flight-data-caption">{formatShortDate(observation.observation_date)} · {formatWavelength(observation.wavelength_min_um, observation.wavelength_max_um)}</div></> : <p>Archive image loading…</p>}</div><span className="flight-place">THE ARCHIVE</span></div>
      </motion.div>
      <div className="flight-traveler" aria-hidden="true"><div className="flight-trail" /><svg viewBox="0 0 120 80" role="presentation"><path d="M14 40 62 20 104 40 62 60Z" fill="#d3dbff" stroke="#8fe4ef" strokeWidth="2"/><path d="M51 26 71 26 83 40 71 54 51 54 58 40Z" fill="#5766a9"/><path d="M14 40 4 30 5 50Z" fill="#8fe4ef"/><circle cx="92" cy="40" r="5" fill="#e8faff"/></svg></div>
      <span className="flight-science-label">{active === 2 ? "Archive data · original observation pixels" : "Conceptual illustration · not a sky map"}</span>
      <div className="flight-story-card" aria-live="polite"><AnimatePresence mode="wait"><motion.div key={active} initial={reduced ? false : { opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0, y: -12 }} transition={{ duration: reduced ? 0 : .35 }}><span className="eyebrow">{chapters[active].label}</span><h2>{chapters[active].title}</h2><p>{chapters[active].copy}</p>{active === 2 && observation && <div className="flight-source-links"><Link href={`/explore?obs=${observation.id}`}>Inspect this observation ↗</Link>{observation.archive_url && <a href={observation.archive_url} target="_blank" rel="noreferrer">Original archive source ↗</a>}</div>}</motion.div></AnimatePresence></div>
    </div>
    <div className="flight-controls"><div className="flight-stops" role="group" aria-label="Journey destinations">{chapters.map((chapter, index) => <button type="button" key={chapter.name} aria-pressed={active === index} onClick={() => choose(index)}><span>0{index + 1}</span>{chapter.name}</button>)}</div><div className="flight-buttons"><button type="button" onClick={() => choose(Math.max(0, active - 1))} disabled={active === 0} aria-label="Previous destination"><RiArrowLeftLine /></button><button type="button" onClick={() => { if (active === chapters.length - 1) setActive(0); setPlaying(value => !value); }} disabled={paused || reduced} aria-label={playing ? "Pause journey" : "Play journey"}>{playing && !paused && !reduced ? <RiPauseLine /> : <RiPlayLine />}</button><button type="button" onClick={() => choose(Math.min(chapters.length - 1, active + 1))} disabled={active === chapters.length - 1} aria-label="Next destination"><RiArrowRightLine /></button></div></div>
    <div className="flight-footer"><span>A visual route to real observations. A difference between images still needs scientific checks.</span><a href="#first-comparison">Continue to a real comparison ↓</a></div>
  </section>;
}
