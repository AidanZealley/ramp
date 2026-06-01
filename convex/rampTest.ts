/**
 * Server-side copy of the hardcoded ramp test protocol. This intentionally
 * duplicates the interval data in
 * `apps/web/src/experiences/ramp-test/ramp-protocol.ts` so the persisted
 * activity snapshot is derived server-side and not trusted from the client.
 * Keep the two copies in sync when editing the protocol.
 */

export type RampTestInterval = {
  startPower: number
  endPower: number
  durationSeconds: number
  comment?: string
}

export type RampTestProtocol = {
  builtInId: string
  title: string
  intervals: Array<RampTestInterval>
}

const RAMP_STEP_DURATION_SECONDS = 60
const RAMP_START_WATTS = 100
const RAMP_STEP_WATTS = 20
const RAMP_STEP_COUNT = 28

const WARMUP_INTERVALS: Array<RampTestInterval> = [
  { startPower: 50, endPower: 95, durationSeconds: 180, comment: "Warm up" },
]

const RAMP_INTERVALS: Array<RampTestInterval> = Array.from(
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

const COOLDOWN_INTERVALS: Array<RampTestInterval> = [
  { startPower: 75, endPower: 70, durationSeconds: 600, comment: "Cool down" },
]

const CLASSIC_RAMP_TEST: RampTestProtocol = {
  builtInId: "classic",
  title: "Ramp Test",
  intervals: [...WARMUP_INTERVALS, ...RAMP_INTERVALS, ...COOLDOWN_INTERVALS],
}

export const RAMP_TEST_PROTOCOLS: Record<string, RampTestProtocol> = {
  [CLASSIC_RAMP_TEST.builtInId]: CLASSIC_RAMP_TEST,
}

export function getRampTestProtocol(builtInId: string): RampTestProtocol {
  const protocol: RampTestProtocol | undefined =
    RAMP_TEST_PROTOCOLS[builtInId]
  if (!protocol) {
    throw new Error(`Unknown ramp test protocol: ${builtInId}`)
  }
  return protocol
}

export function getRampTestTotalDurationSeconds(
  protocol: RampTestProtocol
): number {
  return protocol.intervals.reduce(
    (total, interval) => total + Math.max(0, interval.durationSeconds),
    0
  )
}
