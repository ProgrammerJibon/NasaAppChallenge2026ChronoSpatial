"use client";

import { useEffect, useRef, useState } from "react";
import { RiArrowRightUpLine } from "react-icons/ri";

const SOURCE = "https://svs.gsfc.nasa.gov/vis/a010000/a010600/a010663/Re-Ionization-Galaxy_Evolution-tracking_shot-ProRes.webmhd.webm";
const POSTER = "https://svs.gsfc.nasa.gov/vis/a010000/a010600/a010663/Re-Ionization-Galaxy_Evolution-tracking_shot-H264-720p.01327_print.jpg";
// The source's closing credits begin after the visualization. Crossfade two
// copies of its animated section so the background never shows the end card.
const SCENE_START = 4;
const FADE_AT = 33;

export function CosmicWebScene() {
  const videos = useRef<(HTMLVideoElement | null)[]>([null, null]);
  const activeRef = useRef(0);
  const changingRef = useRef(false);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    videos.current.forEach((video, index) => {
      if (!video) return;
      const initialize = () => {
        video.currentTime = SCENE_START;
        if (index !== 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        const playFirst = () => { setReady(true); void video.play().catch(() => {}); };
        if (video.seeking) video.addEventListener("seeked", playFirst, { once: true, signal: controller.signal });
        else playFirst();
      };
      if (video.readyState >= HTMLMediaElement.HAVE_METADATA) initialize();
      else video.addEventListener("loadedmetadata", initialize, { once: true, signal: controller.signal });
    });
    return () => controller.abort();
  }, []);

  const handleTimeUpdate = (index: number) => {
    const current = videos.current[index];
    if (!current || index !== activeRef.current || changingRef.current || current.currentTime < FADE_AT) return;
    const nextIndex = 1 - index;
    const next = videos.current[nextIndex];
    if (!next || next.readyState < HTMLMediaElement.HAVE_METADATA) {
      if (current.currentTime >= FADE_AT + 2) current.currentTime = SCENE_START;
      return;
    }
    changingRef.current = true;
    const activate = () => {
      void next.play().then(() => {
        activeRef.current = nextIndex;
        setActive(nextIndex);
        changingRef.current = false;
      }).catch(() => { current.currentTime = SCENE_START; changingRef.current = false; });
    };
    if (Math.abs(next.currentTime - SCENE_START) < .1) activate();
    else {
      next.addEventListener("seeked", activate, { once: true });
      next.currentTime = SCENE_START;
    }
  };

  return <div className="observation-review-film">
    {[0, 1].map(index => <video
      key={index}
      ref={element => { videos.current[index] = element; }}
      className={`observation-review-film-layer ${ready && active === index ? "is-active" : ""}`}
      src={SOURCE}
      poster={POSTER}
      muted
      playsInline
      preload="metadata"
      aria-hidden="true"
      onTimeUpdate={() => handleTimeUpdate(index)}
    />)}
    <div className="observation-review-film-credit"><span>Cosmic web simulation · illustrative, not SPHEREx data</span><a href="https://svs.gsfc.nasa.gov/10663/" target="_blank" rel="noreferrer">NASA SVS / Goddard / AVL-NCSA <RiArrowRightUpLine/></a></div>
  </div>;
}
