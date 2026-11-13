"use client";

import { useEffect, useRef } from "react";

const fraction = (value: number) => value - Math.floor(value);
const random = (seed: number) => fraction(Math.sin(seed * 127.1 + 78.233) * 43758.5453);

const stars = Array.from({ length: 125 }, (_, index) => ({
  x: random(index + 1),
  y: random(index + 204),
  size: 0.5 + random(index + 501) * 1.25,
  phase: random(index + 811) * Math.PI * 2,
}));

const dust = Array.from({ length: 240 }, (_, index) => ({
  angle: index * 2.39996,
  radius: 0.11 + random(index + 1120) * 0.38,
  size: 0.45 + random(index + 1400) * 1.4,
  phase: random(index + 1700) * Math.PI * 2,
  speed: 0.35 + random(index + 1900) * 0.55,
}));

export function TeamCosmos() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !host || !context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 0;
    let height = 0;
    let visible = true;
    let frame = 0;

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const seconds = time * 0.001;
      const scale = Math.min(width, height);
      const centerX = width * (width < 700 ? 0.5 : 0.75);
      const centerY = height * (width < 700 ? 0.72 : 0.5);

      const motion = reducedMotion.matches ? 0 : seconds;
      const blooms = [
        { x: centerX - scale * 0.19 + Math.sin(motion * 0.09) * scale * 0.035, y: centerY - scale * 0.14, radius: scale * 0.42, color: "39,178,189", alpha: 0.13 },
        { x: centerX + scale * 0.22, y: centerY + Math.cos(motion * 0.08) * scale * 0.08, radius: scale * 0.4, color: "68,104,202", alpha: 0.12 },
        { x: centerX - scale * 0.03, y: centerY + scale * 0.2, radius: scale * 0.33, color: "136,102,202", alpha: 0.08 },
      ];
      for (const bloom of blooms) {
        const gradient = context.createRadialGradient(bloom.x, bloom.y, 0, bloom.x, bloom.y, bloom.radius);
        gradient.addColorStop(0, `rgba(${bloom.color},${bloom.alpha})`);
        gradient.addColorStop(0.48, `rgba(${bloom.color},${bloom.alpha * 0.35})`);
        gradient.addColorStop(1, `rgba(${bloom.color},0)`);
        context.fillStyle = gradient;
        context.fillRect(0, 0, width, height);
      }

      for (const star of stars) {
        const glimmer = reducedMotion.matches ? 0.5 : 0.5 + Math.sin(seconds * 0.8 + star.phase) * 0.25;
        context.beginPath();
        context.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(179,234,246,${glimmer * 0.5})`;
        context.fill();
      }

      context.save();
      context.translate(centerX, centerY);
      context.rotate(-0.23 + Math.sin(motion * 0.05) * 0.06);
      for (let band = 0; band < 3; band++) {
        context.beginPath();
        context.ellipse(0, 0, scale * (0.28 + band * 0.085), scale * (0.12 + band * 0.033), 0, Math.PI * (0.15 + band * 0.13), Math.PI * (1.45 + band * 0.12));
        context.strokeStyle = `rgba(${band === 1 ? "152,163,245" : "89,211,214"},${0.1 - band * 0.018})`;
        context.lineWidth = 1.5 + band * 0.5;
        context.stroke();
      }
      context.restore();

      for (const particle of dust) {
        const angle = particle.angle + (reducedMotion.matches ? 0 : seconds * 0.075 * particle.speed);
        const radius = particle.radius * scale;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius * 0.72;
        const alpha = 0.16 + (Math.sin(angle * 2 + particle.phase) + 1) * 0.09;
        context.beginPath();
        context.arc(x, y, particle.size, 0, Math.PI * 2);
        context.fillStyle = `rgba(${particle.speed > 0.75 ? "178,179,255" : "107,226,228"},${alpha})`;
        context.fill();
      }

      if (!reducedMotion.matches) {
        for (let index = 0; index < 3; index++) {
          const cycle = (seconds * (0.13 + index * 0.03) + index * 0.37) % 1;
          const x = centerX + (cycle - 0.5) * scale * 0.9;
          const y = centerY - scale * 0.26 + cycle * scale * 0.27 + index * scale * 0.12;
          const trail = context.createLinearGradient(x - 28, y + 10, x, y);
          trail.addColorStop(0, "rgba(91,226,225,0)");
          trail.addColorStop(1, `rgba(151,247,247,${Math.sin(cycle * Math.PI) * 0.26})`);
          context.beginPath();
          context.moveTo(x - 28, y + 10);
          context.lineTo(x, y);
          context.strokeStyle = trail;
          context.lineWidth = 1;
          context.stroke();
        }
      }
    };

    const tick = (time: number) => {
      draw(time);
      frame = visible && !reducedMotion.matches ? requestAnimationFrame(tick) : 0;
    };
    const start = () => {
      if (frame || !visible) return;
      if (reducedMotion.matches) draw(0);
      else frame = requestAnimationFrame(tick);
    };
    const resize = () => {
      const bounds = host.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      if (reducedMotion.matches) draw(0);
    };
    const onMotionChange = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      start();
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) start();
      else { cancelAnimationFrame(frame); frame = 0; }
    });
    intersectionObserver.observe(host);
    reducedMotion.addEventListener("change", onMotionChange);
    resize();
    start();

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", onMotionChange);
    };
  }, []);

  return <canvas ref={canvasRef} className="team-cosmos" aria-hidden="true" />;
}
