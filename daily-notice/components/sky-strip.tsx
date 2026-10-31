"use client";

import type { Sky } from "@/hooks/use-sky";

function spokenTime(time: string | undefined) {
  if (!time) return "計算中";
  if (time === "—") return "時刻なし";
  const [hour, minute] = time.split(":").map(Number);
  return `${hour}時${minute}分`;
}

export function SkyStrip({ sky }: { sky: Sky | null }) {
  return <div className="sky-strip" role="group" aria-label="大阪の空（日本時間）">
    <span className="sky-item" role="group" aria-label={`日の出 ${spokenTime(sky?.sunrise)}`}>
      <span className="sky-label" aria-hidden="true">日の出</span>
      <span className="sky-value" aria-hidden="true">{sky?.sunrise ?? "—"}</span>
    </span>
    <span className="sky-item" role="group" aria-label={`日の入 ${spokenTime(sky?.sunset)}`}>
      <span className="sky-label" aria-hidden="true">日の入</span>
      <span className="sky-value" aria-hidden="true">{sky?.sunset ?? "—"}</span>
    </span>
  </div>;
}
