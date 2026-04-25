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
import { EDITOR_HEIGHT, TIMELINE_EDGE_GUTTER } from "@/lib/timeline/types";

export interface TimelineScale {
  pixelsPerSecond: number;
  maxPower: number;
  workoutWidth: number;
  contentWidth: number;
  leftGutter: number;
  rightGutter: number;
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

  const workoutWidth = useMemo(
    () => Math.max(timeToX(totalDurationSec, pixelsPerSecond), 300),
    [totalDurationSec, pixelsPerSecond]
  );

  const leftGutter = TIMELINE_EDGE_GUTTER;
  const rightGutter = TIMELINE_EDGE_GUTTER;

  const contentWidth = useMemo(
    () => workoutWidth + leftGutter + rightGutter,
    [workoutWidth, leftGutter, rightGutter]
  );

  const powerTicks = useMemo(
    () => computePowerTicks(maxPower, powerMode),
    [maxPower, powerMode]
  );

  const timeTicks = useMemo(
    () => computeTimeTicks(totalDurationSec, pixelsPerSecond),
    [totalDurationSec, pixelsPerSecond]
  );

  // Bound mapping functions
  const boundTimeToX = useCallback(
    (seconds: number) => leftGutter + timeToX(seconds, pixelsPerSecond),
    [leftGutter, pixelsPerSecond]
  );

  const boundXToTime = useCallback(
    (x: number) => xToTime(Math.max(0, x - leftGutter), pixelsPerSecond),
    [leftGutter, pixelsPerSecond]
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
      leftGutter + rawGetIntervalStartX(index, intervals, pixelsPerSecond),
    [leftGutter, intervals, pixelsPerSecond]
  );

  const boundGetIntervalWidth = useCallback(
    (interval: Interval) => rawGetIntervalWidth(interval, pixelsPerSecond),
    [pixelsPerSecond]
  );

  return useMemo(
    () => ({
      pixelsPerSecond,
      maxPower,
      workoutWidth,
      contentWidth,
      leftGutter,
      rightGutter,
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
      workoutWidth,
      contentWidth,
      leftGutter,
      rightGutter,
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
