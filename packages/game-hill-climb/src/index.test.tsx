// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import type {
  RideSessionController,
  RideSessionState,
  RideTrainerAdapter,
  TrainerCommandSource,
} from "@ramp/ride-core"
import { HillClimbGameView, HILL_CLIMB_STAGE, sampleStageAtDistance } from "./index"

function createSession(
  state: Partial<RideSessionState> = {}
): RideSessionController {
  const baseState: RideSessionState = {
    telemetry: {
      elapsedSeconds: 0,
      distanceMeters: 0,
      speedMps: 8,
      powerWatts: 220,
      cadenceRpm: 88,
      heartRateBpm: null,
      trainerStatus: "ready",
    },
    trainerConnected: true,
    paused: false,
    activeControlMode: "manual",
    lastError: null,
  }
  const telemetry = {
    ...baseState.telemetry,
    ...state.telemetry,
  }
  const resolvedState: RideSessionState = {
    ...baseState,
    ...state,
    telemetry,
  }

  return {
    getState: () => resolvedState,
    subscribe: () => () => {},
    connectTrainer: async (_trainer: RideTrainerAdapter) => {},
    disconnectTrainer: async () => {},
    pause: () => {},
    resume: () => {},
    controls: {
      dispatch: vi.fn(
        async (
          _command,
          _source: TrainerCommandSource
        ) => ({ ok: true }) as const
      ),
      getCapabilities: () => new Set(),
    },
  }
}

describe("hill climb stage sampling", () => {
  it("returns the expected grade at segment boundaries", () => {
    expect(sampleStageAtDistance(HILL_CLIMB_STAGE, 0).gradePercent).toBe(2.4)
    expect(sampleStageAtDistance(HILL_CLIMB_STAGE, 480).gradePercent).toBe(5.2)
    expect(sampleStageAtDistance(HILL_CLIMB_STAGE, 1100).gradePercent).toBe(7.1)
  })

  it("reports progress and clamps remaining distance at completion", () => {
    const stageDistance = HILL_CLIMB_STAGE.segments.reduce(
      (total, segment) => total + segment.lengthMeters,
      0
    )
    const sample = sampleStageAtDistance(HILL_CLIMB_STAGE, stageDistance + 200)

    expect(sample.stageComplete).toBe(true)
    expect(sample.normalizedProgress).toBe(1)
    expect(sample.remainingMeters).toBe(0)
  })
})

describe("HillClimbGameView", () => {
  it("dispatches simulation grade for the active segment", async () => {
    const session = createSession()

    render(<HillClimbGameView session={session} />)

    await waitFor(() =>
      expect(session.controls.dispatch).toHaveBeenCalledWith(
        { type: "setSimulationGrade", gradePercent: 2.4 },
        "game"
      )
    )
  })

  it("shows a summary overlay after stage completion", () => {
    const totalDistance = HILL_CLIMB_STAGE.segments.reduce(
      (total, segment) => total + segment.lengthMeters,
      0
    )
    const session = createSession({
      telemetry: {
        elapsedSeconds: 402,
        distanceMeters: totalDistance,
        powerWatts: 245,
        cadenceRpm: 90,
        speedMps: 7.8,
        heartRateBpm: null,
        trainerStatus: "ready",
      },
    })

    render(<HillClimbGameView session={session} />)

    expect(screen.getByText("Stage complete")).toBeTruthy()
    expect(screen.getByText("Ride again")).toBeTruthy()
    expect(screen.getByText("Back to games")).toBeTruthy()
  })
})
