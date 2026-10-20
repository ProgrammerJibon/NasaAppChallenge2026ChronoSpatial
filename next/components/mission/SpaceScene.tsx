"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { RiRocket2Line } from "react-icons/ri";
export type SceneKind = "planet" | "galaxy" | "blackhole" | "ship";
export function SpaceScene({kind,paused=false}:{kind:SceneKind;paused?:boolean}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused || reduceMotion) video.pause();
    else void video.play().catch(() => {});
  }, [paused, reduceMotion]);
  return <div className={`mission-scene scene-${kind}`} aria-hidden="true">
    {kind === "blackhole" && !reduceMotion && <video ref={videoRef} className="blackhole-video" muted loop playsInline preload="metadata" src="https://svs.gsfc.nasa.gov/vis/a010000/a013300/a013326/BH_AccretionDisk_Sim_Stationary_WebSize.webm" />}
    {Array.from({length:18},(_,i)=><i className="scene-star" key={i} style={{left:`${(i*37+7)%100}%`,top:`${(i*23+11)%100}%`,animationDelay:`${i*.3}s`}} />)}
    <div className="scene-orbit" /><div className="scene-world" /><div className="galaxy-art" /><div className="blackhole-art" /><div className="spaceship-art"><RiRocket2Line /><span /></div>
  </div>;
}
