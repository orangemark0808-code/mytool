"use client";

import { useEffect, useState } from "react";
import { calculateSky, watchSky } from "@/lib/sky.mjs";

export type Sky = ReturnType<typeof calculateSky>;

/** One existing sky clock feeds the header and date row together. */
export function useSky(onDateChange: (day: string) => void) {
  const [sky, setSky] = useState<Sky | null>(null);
  useEffect(() => watchSky((value: Sky) => {
    setSky(value);
    onDateChange(value.day);
  }), [onDateChange]);
  return sky;
}
