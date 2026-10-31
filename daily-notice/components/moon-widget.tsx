"use client";

import { useEffect, useMemo, useRef } from "react";
import type { Sky } from "@/hooks/use-sky";
import { nextMoonMilestone } from "@/lib/moon-widget.mjs";
import { drawMoonSphere, readMoonTexture } from "@/lib/moon-sphere.mjs";

export function MoonWidget({ sky }: { sky: Sky | null }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const milestone = useMemo(() => sky ? nextMoonMilestone(sky.day) : null, [sky?.day]);
  const fraction = sky ? Math.round(sky.fraction * 100) : null;

  useEffect(() => {
    const target = canvas.current;
    if (!target || !sky) return;
    let disposed = false;
    let settled = false;
    let texture: ReturnType<typeof readMoonTexture> = null;
    let drawnSize = "";
    const photo = new Image();
    const draw = () => {
      if (disposed || !settled) return;
      const size = `${target.getBoundingClientRect().width}:${window.devicePixelRatio}`;
      if (size === drawnSize) return;
      drawMoonSphere(target, sky.phase, texture, window.devicePixelRatio);
      drawnSize = size;
    };
    photo.onload = () => { texture = readMoonTexture(photo); settled = true; draw(); };
    photo.onerror = () => { texture = null; settled = true; draw(); };
    photo.src = import.meta.env.BASE_URL + "assets/moon-full.webp?v=2026-10-24-03";
    const observer = new ResizeObserver(draw);
    observer.observe(target);
    window.addEventListener("resize", draw);
    return () => {
      disposed = true;
      photo.onload = null;
      photo.onerror = null;
      observer.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [sky]);

  return <div className="moon-widget" role="img" aria-label={sky && milestone
    ? `月齢${sky.ageLabel} ${sky.name} 輝面比${fraction}% ${milestone.label}`
    : "月齢を計算中"}>
    <canvas ref={canvas} className="moon-photo" width="216" height="216" aria-hidden="true" />
    <div className="moon-copy" aria-hidden="true">
      <p className="moon-primary"><span className="sky-label">月齢</span><span className="sky-value">{sky?.ageLabel ?? "—"}</span><span className="moon-name">{sky?.name ?? ""}</span></p>
      <p className="moon-secondary">輝面比 <span>{fraction ?? "—"}%</span><span className="moon-dot"> · </span>{milestone?.label ?? "計算中"}</p>
    </div>
  </div>;
}
