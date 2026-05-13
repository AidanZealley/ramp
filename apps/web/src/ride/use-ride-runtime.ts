import { useCallback, useEffect, useRef, useState } from "react"
import { createRideSession } from "@ramp/ride-core"
import {
  SimulatedTrainer,
  isWebBluetoothAvailable,
  requestBleTrainer,
} from "@ramp/trainer-io"
import type {
  RideConnectionResult,
  RideExperienceConnection,
  RideSessionController,
} from "@ramp/ride-core"
import type {
  RiderPowerMode,
  SimulatedRiderState,
  SimulatedTrainerMode,
  SimulatedTrainerState,
  TrainerError,
  TrainerSource,
} from "@ramp/trainer-io"

export type RideTrainerSource = "none" | "simulated" | "ble"

export type RideRuntimeController = {
  ready: boolean
  session: RideSessionController | null
  connection: RideExperienceConnection
  trainer: TrainerSource | null
  source: RideTrainerSource
  bleAvailable: boolean
  selectingTrainer: boolean
  connecting: boolean
  connectionError: string | null
  connectTrainer: () => Promise<RideConnectionResult>
  useSimulatorTrainer: () => Promise<RideConnectionResult>
  disconnectTrainer: () => Promise<void>
}

export type RideSimulatorControls = {
  active: boolean
  riderState: SimulatedRiderState | null
  trainerState: SimulatedTrainerState | null
  setRiderPowerMode: (mode: RiderPowerMode) => void
  setRiderPaused: (paused: boolean) => void
  setManualPower: (watts: number) => void
  setCadence: (rpm: number) => void
  setTrainerMode: (mode: SimulatedTrainerMode) => Promise<void>
  setTargetPower: (watts: number) => Promise<void>
  setResistance: (percent: number) => Promise<void>
  setSimulationGrade: (percent: number) => Promise<void>
}

const cancelledSelectionError: TrainerError = {
  code: "permission",
  message: "Bluetooth trainer selection was cancelled.",
}

const initializingConnectionError: TrainerError = {
  code: "transport",
  message: "Ride session is still initializing.",
}

const simulatorBySession = new WeakMap<
  RideSessionController,
  SimulatedTrainer
>()

export function useRideRuntime(): RideRuntimeController {
  const [session, setSession] = useState<RideSessionController | null>(null)
  const [trainer, setTrainer] = useState<TrainerSource | null>(null)
  const [source, setSource] = useState<RideTrainerSource>("none")
  const [bleAvailable, setBleAvailable] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [selectingTrainer, setSelectingTrainer] = useState(false)
  const [status, setStatus] =
    useState<RideExperienceConnection["status"]>("disconnected")
  const [lastError, setLastError] = useState<TrainerError | null>(null)
  const trainerRef = useRef<TrainerSource | null>(trainer)
  const sourceRef = useRef<RideTrainerSource>(source)
  const connectingRef = useRef(false)
  const selectingTrainerRef = useRef(false)

  useEffect(() => {
    const nextSession = createRideSession()
    const nextSimulatedTrainer = import.meta.env.DEV
      ? new SimulatedTrainer()
      : null

    if (nextSimulatedTrainer) {
      simulatorBySession.set(nextSession, nextSimulatedTrainer)
    }
    setSession(nextSession)

    return () => {
      void nextSession.dispose()
      setSession(null)
    }
  }, [])

  useEffect(() => {
    setBleAvailable(isWebBluetoothAvailable())
  }, [])

  useEffect(() => {
    trainerRef.current = trainer
  }, [trainer])

  useEffect(() => {
    sourceRef.current = source
  }, [source])

  useEffect(() => {
    if (!session) return
    return session.subscribe(() => {
      const state = session.getState()
      setStatus(
        state.trainerConnected
          ? "connected"
          : state.telemetry.trainerStatus === "connecting"
            ? "connecting"
            : state.telemetry.trainerStatus === "error"
              ? "error"
              : "disconnected"
      )
      setLastError(state.lastTrainerError)
    })
  }, [session])

  const attachTrainer = useCallback(
    async (
      nextTrainer: TrainerSource,
      nextSource: Exclude<RideTrainerSource, "none">
    ): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }
      if (connectingRef.current) {
        return {
          ok: false,
          error: { code: "transport", message: "Connection already running." },
        }
      }
      connectingRef.current = true
      setConnecting(true)
      setConnectionError(null)
      setStatus("connecting")
      try {
        const result = await session.connectTrainer(nextTrainer)
        if (!result.ok) {
          setConnectionError(result.error.message)
          setLastError(result.error)
          setStatus("error")
          return result
        }
        setTrainer(nextTrainer)
        setSource(nextSource)
        setLastError(null)
        setStatus("connected")
        return result
      } finally {
        connectingRef.current = false
        setConnecting(false)
      }
    },
    [session]
  )

  const connectTrainer =
    useCallback(async (): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }
      if (selectingTrainerRef.current || connectingRef.current) {
        return {
          ok: false,
          error: { code: "transport", message: "Connection already running." },
        }
      }
      if (!bleAvailable) {
        const error: TrainerError = {
          code: "unsupported",
          message: "Web Bluetooth requires a Chromium-class browser.",
        }
        setConnectionError(error.message)
        return { ok: false, error }
      }
      selectingTrainerRef.current = true
      setSelectingTrainer(true)
      setConnectionError(null)
      try {
        const nextTrainer = await requestBleTrainer()
        return await attachTrainer(nextTrainer, "ble")
      } catch {
        setConnectionError(cancelledSelectionError.message)
        return { ok: false, error: cancelledSelectionError }
      } finally {
        selectingTrainerRef.current = false
        setSelectingTrainer(false)
      }
    }, [attachTrainer, bleAvailable, session])

  const useSimulatorTrainer =
    useCallback(async (): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }
      if (connectingRef.current) {
        return {
          ok: false,
          error: { code: "transport", message: "Connection already running." },
        }
      }
      const simulatedTrainer = simulatorBySession.get(session)
      if (!simulatedTrainer) {
        const error: TrainerError = {
          code: "unsupported",
          message: "The ride simulator is not available.",
        }
        setConnectionError(error.message)
        return { ok: false, error }
      }
      return attachTrainer(simulatedTrainer, "simulated")
    }, [attachTrainer, session])

  const disconnectTrainer = useCallback(async (): Promise<void> => {
    if (!session) return
    await session.disconnectTrainer()
    setTrainer(null)
    setSource("none")
    setStatus("disconnected")
  }, [session])

  const reconnect = useCallback(async (): Promise<RideConnectionResult> => {
    if (!session) return { ok: false, error: initializingConnectionError }
    const activeTrainer = trainerRef.current
    const activeSource = sourceRef.current
    if (activeTrainer && activeSource !== "none") {
      return attachTrainer(activeTrainer, activeSource)
    }
    return connectTrainer()
  }, [attachTrainer, connectTrainer, session])

  return {
    ready: session !== null,
    session,
    connection: {
      status,
      reconnect,
      disconnect: disconnectTrainer,
      error: lastError,
    },
    trainer,
    bleAvailable,
    source,
    selectingTrainer,
    connecting,
    connectionError,
    connectTrainer,
    useSimulatorTrainer,
    disconnectTrainer,
  }
}

export function useRideSimulatorControls(
  runtime: RideRuntimeController
): RideSimulatorControls {
  const simulator =
    runtime.session && import.meta.env.DEV
      ? simulatorBySession.get(runtime.session)
      : null
  const [riderState, setRiderState] = useState<SimulatedRiderState | null>(
    simulator?.rider.state ?? null
  )
  const [trainerState, setTrainerState] =
    useState<SimulatedTrainerState | null>(simulator?.simulator ?? null)

  useEffect(() => {
    if (!simulator) {
      setRiderState(null)
      setTrainerState(null)
      return
    }

    setRiderState(simulator.rider.state)
    setTrainerState(simulator.simulator)
    const unsubscribeRider = simulator.rider.subscribeState(setRiderState)
    const unsubscribeTrainer =
      simulator.subscribeSimulatorState(setTrainerState)
    return () => {
      unsubscribeRider()
      unsubscribeTrainer()
    }
  }, [simulator])

  return {
    active: runtime.source === "simulated" && simulator != null,
    riderState: runtime.source === "simulated" ? riderState : null,
    trainerState: runtime.source === "simulated" ? trainerState : null,
    setRiderPowerMode(mode) {
      simulator?.rider.dispatch({ type: "setPowerMode", mode })
    },
    setRiderPaused(paused) {
      simulator?.rider.dispatch({ type: "setPaused", paused })
    },
    setManualPower(watts) {
      simulator?.rider.dispatch({ type: "setManualPower", watts })
    },
    setCadence(rpm) {
      simulator?.rider.dispatch({ type: "setCadence", rpm })
    },
    async setTrainerMode(mode) {
      await simulator?.sendCommand({ type: "setMode", mode })
    },
    async setTargetPower(watts) {
      await simulator?.sendCommand({ type: "setTargetPower", watts })
    },
    async setResistance(percent) {
      await simulator?.sendCommand({ type: "setResistance", level: percent })
    },
    async setSimulationGrade(percent) {
      await simulator?.sendCommand({
        type: "setSimulationGrade",
        gradePercent: percent,
        windSpeedMps: trainerState?.windSpeedMps ?? 0,
      })
    },
  }
}
