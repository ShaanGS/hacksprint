"use client";

import { useEffect, useRef } from "react";
import { colors } from "@design/tokens";

// The listening orb (reference 2): points spread evenly over a sphere, turning and gently
// breathing, drawn on a canvas so no package is needed. It moves only while `active`, and stands
// still for anyone who asks for reduced motion.

const POINTS = 900;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const TURN_PER_FRAME = 0.006;

/** Even points on a unit sphere (a Fibonacci spiral). */
function spherePoints(count: number): [number, number, number][] {
  return Array.from({ length: count }, (_, index) => {
    const y = 1 - (index / (count - 1)) * 2;
    const ring = Math.sqrt(1 - y * y);
    const turn = GOLDEN_ANGLE * index;
    return [Math.cos(turn) * ring, y, Math.sin(turn) * ring];
  });
}

export function Orb({ size = 220, active = true }: { size?: number; active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const ratio = window.devicePixelRatio || 1;
    element.width = size * ratio;
    element.height = size * ratio;
    context.scale(ratio, ratio);
    const points = spherePoints(POINTS);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let angle = 0;
    let frame = 0;

    const draw = (time: number) => {
      context.clearRect(0, 0, size, size);
      const breath = active && !still ? 1 + Math.sin(time / 420) * 0.03 : 1;
      const radius = size * 0.38 * breath;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      context.fillStyle = colors.lime;
      for (const [x, y, z] of points) {
        // A soft ripple over the surface makes it read as alive rather than a ball.
        const ripple = 1 + 0.07 * Math.sin(3 * y + time / 600) * Math.cos(2 * x + time / 900);
        const turnedX = x * cos - z * sin;
        const depth = (x * sin + z * cos + 1) / 2;
        const dot = 0.7 + depth * 1.4;
        context.globalAlpha = 0.2 + depth * 0.8;
        context.fillRect(
          size / 2 + turnedX * radius * ripple - dot / 2,
          size / 2 + y * radius * ripple - dot / 2,
          dot,
          dot,
        );
      }
      if (active && !still) {
        angle += TURN_PER_FRAME;
        frame = requestAnimationFrame(draw);
      }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [size, active]);

  return (
    <canvas
      ref={canvas}
      aria-hidden
      style={{ width: size, height: size }}
      className="pointer-events-none"
    />
  );
}
