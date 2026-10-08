"use client";

import { useEffect, useState, useRef } from "react";
import { useReducedMotionSafe } from "@/hooks/useReducedMotionSafe";

export interface CounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export function Counter({
  value,
  duration = 1.5,
  prefix = "",
  suffix = "",
}: CounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const reducedMotion = useReducedMotionSafe();
  const ref = useRef<HTMLSpanElement>(null);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (reducedMotion) {
      setDisplayValue(value);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStarted) {
          setHasStarted(true);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [hasStarted, reducedMotion, value]);

  useEffect(() => {
    if (!hasStarted || reducedMotion) {
      if (reducedMotion) setDisplayValue(value);
      return;
    }

    const startTime = performance.now();
    const durationMs = duration * 1000;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(eased * value));

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [hasStarted, value, duration, reducedMotion]);

  return (
    <span ref={ref} className="tabular-nums font-bold">
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}
