"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { api } from "@/lib/api";

type GalaxyContextViewProps = {
  observationId: string;
  fieldLabel: string;
};

type Stop = "overview" | "core" | "dust" | "cutout";
type Camera = { x: number; y: number; zoom: number; yaw: number; pitch: number };

const stops: Record<Stop, { label: string; title: string; detail: string; camera: Camera }> = {
  overview: { label: "Overview", title: "Explore the Milky Way", detail: "Orbit a conceptual galactic plane textured with a real Spitzer view of the Milky Way's center.", camera: { x: 0, y: 0, zoom: 1, yaw: 0, pitch: 0 } },
  core: { label: "Galactic center", title: "The bright central region", detail: "Zoom into the luminous center of the Spitzer infrared image. Its glow is real imagery; the surrounding 3D shape is illustrative.", camera: { x: -22, y: 18, zoom: 1.7, yaw: -13, pitch: -16 } },
  dust: { label: "Dust lanes", title: "Look through infrared light", detail: "Explore the dark and bright structure in the infrared view. SPHEREx observes across many wavelengths, while this Spitzer image provides visual context.", camera: { x: 86, y: -16, zoom: 1.6, yaw: 25, pitch: 12 } },
  cutout: { label: "Selected cutout", title: "Your actual SPHEREx pixels", detail: "This is the currently selected observation. Its placement beside the galaxy is a guide, not a measured 3D position.", camera: { x: -35, y: 0, zoom: 1.08, yaw: 0, pitch: 0 } },
};

// Fixed positions keep server and client renders identical while giving the scene depth.
const depthStars = Array.from({ length: 115 }, (_, index) => {
  const seed = (index * 1664525 + 1013904223) >>> 0;
  return { x: 3 + seed % 94, y: 5 + (seed >>> 9) % 87, size: index % 17 === 0 ? 3 : index % 5 === 0 ? 2 : 1, opacity: index % 11 === 0 ? .95 : .35 + (index % 6) * .08 };
});

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function GalaxyContextView({ observationId, fieldLabel }: GalaxyContextViewProps) {
  const [camera, setCamera] = useState<Camera>(stops.overview.camera);
  const [stop, setStop] = useState<Stop>("overview");
  const drag = useRef<{ x: number; y: number; button: number } | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setCamera(value => ({ ...value, zoom: clamp(Number((value.zoom * (event.deltaY < 0 ? 1.09 : 1 / 1.09)).toFixed(2)), 0.65, 3.2) }));
    };
    scene.addEventListener("wheel", handleWheel, { passive: false });
    return () => scene.removeEventListener("wheel", handleWheel);
  }, []);

  const goTo = (next: Stop) => { setStop(next); setCamera(stops[next].camera); };
  const zoom = (factor: number) => setCamera(value => ({ ...value, zoom: clamp(Number((value.zoom * factor).toFixed(2)), 0.65, 3.2) }));

  const beginDrag = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button, a, select, input")) return;
    if (event.pointerType === "mouse" && event.button !== 0 && event.button !== 2) return;
    drag.current = { x: event.clientX, y: event.clientY, button: event.button };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    const pan = drag.current.button === 2 || event.shiftKey;
    setCamera(value => pan
      ? { ...value, x: clamp(value.x + dx, -260, 260), y: clamp(value.y + dy, -180, 180) }
      : { ...value, yaw: value.yaw + dx * .42, pitch: clamp(value.pitch - dy * .35, -42, 42) });
    drag.current = { x: event.clientX, y: event.clientY, button: drag.current.button };
  };
  const endDrag = () => { drag.current = null; setDragging(false); };
  const keyControl = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "+" || event.key === "=") { event.preventDefault(); zoom(1.2); }
    if (event.key === "-") { event.preventDefault(); zoom(1 / 1.2); }
    if (event.key === "0") { event.preventDefault(); goTo("overview"); }
    if (event.key.startsWith("Arrow")) {
      event.preventDefault();
      setCamera(value => ({ ...value, yaw: value.yaw + (event.key === "ArrowLeft" ? -12 : event.key === "ArrowRight" ? 12 : 0), pitch: clamp(value.pitch + (event.key === "ArrowUp" ? 10 : event.key === "ArrowDown" ? -10 : 0), -42, 42) }));
    }
  };

  return <div className="galaxy-context-view" aria-label="Interactive conceptual 3D view of the Milky Way with a real NASA Spitzer image">
    <div className="galaxy-context-topline"><span>EXPLORE THE MILKY WAY</span><span>SPITZER CONTEXT + SPHEREX EXPOSURE</span></div>
    <div ref={sceneRef} className={`galaxy-context-scene ${dragging ? "is-dragging" : ""} ${stop === "cutout" ? "is-cutout-focused" : ""}`} role="region" aria-label="3D galaxy scene. Drag to orbit, Shift-drag or right-drag to pan, scroll or use buttons to zoom, arrow keys to orbit, and 0 to reset." tabIndex={0} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag} onContextMenu={event => event.preventDefault()} onKeyDown={keyControl}>
      <div className="galaxy-context-camera" style={{ transform: `translate3d(${camera.x}px, ${camera.y}px, 0) scale(${camera.zoom})` }}>
        <div className="galaxy-context-stars" aria-hidden="true">{depthStars.map(({ x, y, size, opacity }, index) => <i key={index} style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, opacity }}/>)}</div>
        <div className="galaxy-context-orbit" style={{ transform: `rotateX(${camera.pitch}deg) rotateY(${camera.yaw}deg)` }}>
          <div className="galaxy-context-halo"/>
          <div className="galaxy-context-disk"/>
          <div className="galaxy-context-core"/>
          <div className="galaxy-context-axis"/>
          <button className="galaxy-context-marker is-core" type="button" onClick={() => goTo("core")} aria-label="Go to galactic center" title="Galactic center"/>
          <button className="galaxy-context-marker is-dust" type="button" onClick={() => goTo("dust")} aria-label="Go to dust lanes" title="Dust lanes"/>
        </div>
      </div>
      <div className="galaxy-context-toolbar" role="group" aria-label="3D view controls">
        <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => zoom(1 / 1.25)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => goTo("overview")} aria-label="Reset 3D view">⌖</button>
      </div>
      <div className="galaxy-context-location" role="group" aria-label="Go to part of the view">{(Object.keys(stops) as Stop[]).map(item => <button type="button" key={item} aria-pressed={stop === item} onClick={() => goTo(item)}>{stops[item].label}</button>)}</div>
      <div className="galaxy-context-exposure">
        <span>YOUR SELECTED CUTOUT</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={api.getPreviewUrl(observationId)} alt={`Actual SPHEREx infrared preview in ${fieldLabel}`} />
        <small>Actual SPHEREx pixels · illustrative placement</small>
        <button type="button" onClick={() => goTo("cutout")}>Inspect this cutout ↗</button>
      </div>
      <div className="galaxy-context-info" aria-live="polite"><strong>{stops[stop].title}</strong><p>{stops[stop].detail}</p></div>
      <div className="galaxy-context-hint">DRAG ORBIT · SHIFT/RIGHT-DRAG PAN · SCROLL ZOOM</div>
    </div>
    <div className="galaxy-context-bottomline">The 3D depth and cutout placement are illustrative, not measured positions. <a href="https://science.nasa.gov/asset/webb/the-galactic-center-in-infrared-light-spitzer/" target="_blank" rel="noreferrer">NASA / Spitzer image source ↗</a></div>
  </div>;
}
