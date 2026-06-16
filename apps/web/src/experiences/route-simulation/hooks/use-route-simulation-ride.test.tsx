import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { Capability } from "@ramp/ride-core"
import { useRouteSimulationRide } from "./use-route-simulation-ride"
import type { RideFrameData, RideSessionState } from "@ramp/ride-core"
import type { ParsedRouteGpx } from "@/lib/routes/types"
import type { RideSessionController } from "@ramp/ride-core"

const route: ParsedRouteGpx = {
  title: "Test route",
  points: [
    { lat: 51.5, lng: -0.12, elevationMeters: 10, distanceMeters: 0 },
    { lat: 51.51, lng: -0.13, elevationMeters: 20, distanceMeters: 1000 },
  ],
  geojson: {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [-0.12, 51.5],
            [-0.13, 51.51],
          ],
        },
      },
    ],
  },
  stats: {
    distanceMeters: 1000,
    elevationGainMeters: 10,
    elevationLossMeters: 0,
    minElevationMeters: 10,
    maxElevationMeters: 20,
    pointCount: 2,
  },
  bounds: {
    minLat: 51.5,
    minLng: -0.13,
    maxLat: 51.51,
    maxLng: -0.12,
  },
  start: { lat: 51.5, lng: -0.12 },
  finish: { lat: 51.51, lng: -0.13 },
  elevationSamples: [],
  previewPoints: [],
}

function createSession() {
  const frameListeners = new Set<(frame: RideFrameData) => void>()
  const storeListeners = new Set<() => void>()
  const dispatch = vi.fn().mockResolvedValue({ ok: true })
  const pause = vi.fn(() => {
    state = { ...state, paused: true }
    storeListeners.forEach((listener) => listener())
  })
  const resume = vi.fn(() => {
    state = { ...state, paused: false }
    storeListeners.forEach((listener) => listener())
  })
  let state: RideSessionState = {
    activeControlMode: "experience",
    lastError: null,
    lastTrainerError: null,
    paused: true,
    telemetry: {
      cadenceRpm: null,
      distanceMeters: 0,
      elapsedSeconds: 0,
      heartRateBpm: null,
      lastTelemetryAtMs: Date.now(),
      powerWatts: 200,
      speedMps: 20,
      telemetryAgeMs: 0,
      telemetrySource: "simulated",
      telemetryStatus: "fresh",
      trainerStatus: "ready",
    },
    trainerConnected: true,
  }

  const session: RideSessionController = {
    getState: () => state,
    getLatestTelemetry: () => null,
    subscribe: (listener) => {
      storeListeners.add(listener)
      return () => storeListeners.delete(listener)
    },
    subscribeFrame: (listener) => {
      frameListeners.add(listener)
      return () => frameListeners.delete(listener)
    },
    pause,
    resume,
    connectTrainer: () => Promise.resolve({ ok: true }),
    disconnectTrainer: () => Promise.resolve(),
    dispose: () => Promise.resolve(),
    controls: {
      dispatch,
      getCapabilities: () => new Set([Capability.SimulationGrade]),
    },
  }

  return {
    dispatch,
    emitFrame: (frame: RideFrameData) => {
      frameListeners.forEach((listener) => listener(frame))
    },
    pause,
    resume,
    session,
  }
}

describe("useRouteSimulationRide", () => {
  it("restarts a completed route from the beginning", async () => {
    const session = createSession()
    const { result } = renderHook(() =>
      useRouteSimulationRide({
        parsedRoute: route,
        physicsConfig: null,
        progressMode: "trainer-speed",
        session: session.session,
        supportsSimulation: true,
        trainerConnected: true,
      })
    )

    await act(async () => {
      await result.current.handleStart()
    })

    act(() => {
      session.emitFrame({
        deltaMs: 60_000,
        distanceMeters: 0,
        elapsedSeconds: 0,
        telemetry: {
          cadenceRpm: null,
          heartRateBpm: null,
          powerWatts: 200,
          source: "simulated",
          speedMps: 20,
          timestampMs: Date.now(),
        },
      })
    })

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true)
      expect(result.current.isActive).toBe(false)
      expect(result.current.distanceMeters).toBe(1000)
      expect(result.current.completionDialogOpen).toBe(true)
    })

    await act(async () => {
      await result.current.handleRestart()
    })

    expect(result.current.distanceMeters).toBe(0)
    expect(result.current.elapsedSeconds).toBe(0)
    expect(result.current.isComplete).toBe(false)
    expect(result.current.isActive).toBe(true)
    expect(result.current.completionDialogOpen).toBe(false)
    expect(session.dispatch).toHaveBeenCalledWith(
      { type: "setMode", mode: "simulation" },
      "experience",
      { delivery: "acknowledged" }
    )
    expect(session.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "setSimulationGrade" }),
      "experience",
      { delivery: "acknowledged" }
    )
  })
})
