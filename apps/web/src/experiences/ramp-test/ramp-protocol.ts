import type { WorkoutDefinition } from "@ramp/ride-workouts"

/**
 * Hardcoded Zwift-style ramp test protocol.
 *
 * Power is expressed in absolute watts (the workout engine's
 * `powerMode: "absolute"` path treats `startPower`/`endPower` as raw watts),
 * so the FTP value the rider has set does not change the targets.
 *
 * Structure:
 *   - a short warmup,
 *   - 28 one-minute steps from 100 W to 640 W (+20 W per minute),
 *   - a 10-minute cooldown.
 *
 * NOTE: the server keeps an independent copy of this interval data in
 * `convex/rampTest.ts` so the persisted activity snapshot is not client
 * trusted. Keep the two in sync when editing the protocol.
 */

export type RampInterval = {
  startPower: number
  endPower: number
  durationSeconds: number
  comment?: string
}

export type RampPhase = "warmup" | "ramp" | "cooldown"

export const RAMP_TEST_BUILT_IN_ID = "classic"
export const RAMP_TEST_TITLE = "Ramp Test"

const RAMP_STEP_DURATION_SECONDS = 60
const RAMP_START_WATTS = 100
const RAMP_STEP_WATTS = 20
const RAMP_STEP_COUNT = 28

export const WARMUP_INTERVALS: ReadonlyArray<RampInterval> = [
  { startPower: 50, endPower: 95, durationSeconds: 180, comment: "Warm up" },
]

export const RAMP_INTERVALS: ReadonlyArray<RampInterval> = Array.from(
  { length: RAMP_STEP_COUNT },
  (_unused, index) => {
    const watts = RAMP_START_WATTS + index * RAMP_STEP_WATTS
    return {
      startPower: watts,
      endPower: watts,
      durationSeconds: RAMP_STEP_DURATION_SECONDS,
      comment: `${watts} W`,
    }
  }
)

export const COOLDOWN_INTERVALS: ReadonlyArray<RampInterval> = [
  { startPower: 75, endPower: 70, durationSeconds: 600, comment: "Cool down" },
]

export const RAMP_TEST_INTERVALS: ReadonlyArray<RampInterval> = [
  ...WARMUP_INTERVALS,
  ...RAMP_INTERVALS,
  ...COOLDOWN_INTERVALS,
]

function sumDuration(intervals: ReadonlyArray<RampInterval>): number {
  return intervals.reduce(
    (total, interval) => total + Math.max(0, interval.durationSeconds),
    0
  )
}

const WARMUP_DURATION_SECONDS = sumDuration(WARMUP_INTERVALS)
const RAMP_DURATION_SECONDS = sumDuration(RAMP_INTERVALS)

/** Elapsed seconds at which the ramp steps begin (end of warmup). */
export function getRampStartSeconds(): number {
  return WARMUP_DURATION_SECONDS
}

/** Elapsed seconds at which the cooldown begins (end of the final ramp step). */
export function getCooldownStartSeconds(): number {
  return WARMUP_DURATION_SECONDS + RAMP_DURATION_SECONDS
}

export function getRampStepDurationSeconds(): number {
  return RAMP_STEP_DURATION_SECONDS
}

export function getRampPhaseAtElapsed(elapsedSeconds: number): RampPhase {
  if (elapsedSeconds < getRampStartSeconds()) return "warmup"
  if (elapsedSeconds < getCooldownStartSeconds()) return "ramp"
  return "cooldown"
}

/**
 * Build the {@link WorkoutDefinition} fed to the workout controller. Built
 * directly (not via the Convex workout mapper) because the ramp test is not a
 * Convex `workouts` document and uses absolute-watt targets that exceed the
 * mapper's percentage range checks.
 */
export function getRampTestDefinition(): WorkoutDefinition {
  return {
    id: `ramp-test:${RAMP_TEST_BUILT_IN_ID}`,
    title: RAMP_TEST_TITLE,
    powerMode: "absolute",
    intervals: RAMP_TEST_INTERVALS.map((interval) => ({ ...interval })),
  }
}

export function getRampTestTotalDurationSeconds(): number {
  return sumDuration(RAMP_TEST_INTERVALS)
}
