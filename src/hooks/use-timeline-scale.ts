import { useMemo, useCallback } from "react";
import type { Interval } from "@/lib/workout-utils";
import { computeMaxPower } from "@/lib/workout-utils";
import {
  timeToX,
  xToTime,
  powerToY as rawPowerToY,
  yToPower as rawYToPower,
  getIntervalStartX as rawGetIntervalStartX,
  getIntervalWidth as rawGetIntervalWidth,
  computePowerTicks,
  computeTimeTicks,
} from "@/lib/timeline/coordinate-system";
import { EDITOR_HEIGHT } from "@/lib/timeline/types";

export interface TimelineScale {
  pixelsPerSecond: number;
  maxPower: number;
  totalWidth: number;
  totalDurationSec: number;

  // Mapping functions (bound to current scale)
  timeToX: (seconds: number) => number;
  xToTime: (x: number) => number;
  powerToY: (power: number) => number;
  yToPower: (y: number) => number;

  // Interval geometry
  getIntervalX: (index: number) => number;
  getIntervalWidth: (interval: Interval) => number;

  // Grid data
  powerTicks: number[];
  timeTicks: number[];
}

/**
 * React hook that creates a memoized coordinate-system scale
 * for the timeline editor. All mapping functions are bound to
 * the current intervals, power mode, and pixelsPerSecond.
 */
export function useTimelineScale(
  intervals: Interval[],
  powerMode: "absolute" | "percentage",
  pixelsPerSecond: number
): TimelineScale {
  const maxPower = useMemo(
    () => computeMaxPower(intervals, powerMode),
    [intervals, powerMode]
  );

  const totalDurationSec = useMemo(
    () => intervals.reduce((s, iv) => s + iv.durationSeconds, 0),
    [intervals]
  );

  const totalWidth = useMemo(
    () => Math.max(timeToX(totalDurationSec, pixelsPerSecond), 300),
    [totalDurationSec, pixelsPerSecond]
  );

  const powerTicks = useMemo(
    () => computePowerTicks(maxPower, powerMode),
    [maxPower, powerMode]
  );

  const timeTicks = useMemo(
    () => computeTimeTicks(totalDurationSec),
    [totalDurationSec]
  );

  // Bound mapping functions
  const boundTimeToX = useCallback(
    (seconds: number) => timeToX(seconds, pixelsPerSecond),
    [pixelsPerSecond]
  );

  const boundXToTime = useCallback(
    (x: number) => xToTime(x, pixelsPerSecond),
    [pixelsPerSecond]
  );

  const boundPowerToY = useCallback(
    (power: number) => rawPowerToY(power, maxPower, EDITOR_HEIGHT),
    [maxPower]
  );

  const boundYToPower = useCallback(
    (y: number) => rawYToPower(y, maxPower, EDITOR_HEIGHT),
    [maxPower]
  );

  const boundGetIntervalX = useCallback(
    (index: number) =>
      rawGetIntervalStartX(index, intervals, pixelsPerSecond),
    [intervals, pixelsPerSecond]
  );

  const boundGetIntervalWidth = useCallback(
    (interval: Interval) => rawGetIntervalWidth(interval, pixelsPerSecond),
    [pixelsPerSecond]
  );

  return useMemo(
    () => ({
      pixelsPerSecond,
      maxPower,
      totalWidth,
      totalDurationSec,
      timeToX: boundTimeToX,
      xToTime: boundXToTime,
      powerToY: boundPowerToY,
      yToPower: boundYToPower,
      getIntervalX: boundGetIntervalX,
      getIntervalWidth: boundGetIntervalWidth,
      powerTicks,
      timeTicks,
    }),
    [
      pixelsPerSecond,
      maxPower,
      totalWidth,
      totalDurationSec,
      boundTimeToX,
      boundXToTime,
      boundPowerToY,
      boundYToPower,
      boundGetIntervalX,
      boundGetIntervalWidth,
      powerTicks,
      timeTicks,
    ]
  );
}
