import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { createRideSession } from "@ramp/ride-core"
import { SimulatedTrainer } from "@ramp/trainer-io"
import { toTrainerError } from "@ramp/ride-contracts"
import type {
  RideConnectionResult,
  RideSessionController,
  RideSessionState,
} from "@ramp/ride-core"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type {
  RideConnectionView,
  RideSavedTrainer,
  RideTrainerDetails,
  RideTrainerSource,
} from "@/ride/trainer-connection/types"
import type {
  RiderPowerMode,
  SimulatedRiderState,
  SimulatedTrainerMode,
  SimulatedTrainerState,
  TrainerError,
  TrainerSource,
} from "@ramp/trainer-io"
import {
  clearSavedTrainer,
  createSavedTrainer,
  findSavedBleDevice,
  readSavedTrainer,
  writeSavedTrainer,
} from "@/ride/trainer-connection/saved-ble-trainer"
import { createRideConnectionView } from "@/ride/trainer-connection/connection-view"
import {
  createBleTrainer,
  getGrantedBleDevices,
  isWebBluetoothAvailable,
  requestBleDevice,
} from "@/ride/trainer-connection/ble-trainer-factory"

export type {
  RideConnectionPhase,
  RideConnectionView,
  RideSavedTrainer,
  RideTrainerDetails,
  RideTrainerSource,
} from "@/ride/trainer-connection/types"

export type RideRuntimeController = {
  ready: boolean
  session: RideSessionController | null
  connection: RideExperienceConnection
  connectionView: RideConnectionView
  trainer: TrainerSource | null
  trainerDetails: RideTrainerDetails | null
  source: RideTrainerSource
  bleAvailable: boolean
  selectingTrainer: boolean
  connecting: boolean
  connectionError: string | null
  connectTrainer: () => Promise<RideConnectionResult>
  useSimulatorTrainer: () => Promise<RideConnectionResult>
  disconnectTrainer: () => Promise<void>
  cancelConnection: () => Promise<void>
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
  code: "cancelled",
  message: "Bluetooth trainer selection was cancelled.",
}

const initializingConnectionError: TrainerError = {
  code: "transport",
  message: "Ride session is still initializing.",
}

const disconnectedSessionState: RideSessionState = {
  telemetry: {
    elapsedSeconds: 0,
    distanceMeters: 0,
    speedMps: null,
    powerWatts: null,
    cadenceRpm: null,
    heartRateBpm: null,
    trainerStatus: "disconnected",
    telemetryStatus: "missing",
    lastTelemetryAtMs: null,
    telemetryAgeMs: null,
    telemetrySource: null,
  },
  trainerConnected: false,
  paused: false,
  activeControlMode: "manual",
  lastError: null,
  lastTrainerError: null,
}

const simulatorBySession = new WeakMap<
  RideSessionController,
  SimulatedTrainer
>()

export function useRideRuntime(): RideRuntimeController {
  const [session, setSession] = useState<RideSessionController | null>(null)
  const [trainer, setTrainer] = useState<TrainerSource | null>(null)
  const [trainerDetails, setTrainerDetails] =
    useState<RideTrainerDetails | null>(null)
  const [pendingTrainerDetails, setPendingTrainerDetails] =
    useState<RideTrainerDetails | null>(null)
  const [source, setSource] = useState<RideTrainerSource>("none")
  const [bleAvailable, setBleAvailable] = useState(false)
  const [connectionError, setConnectionError] = useState<TrainerError | null>(
    null
  )
  const [connecting, setConnecting] = useState(false)
  const [selectingTrainer, setSelectingTrainer] = useState(false)
  const sessionState = useOptionalRideSessionState(session)

  const trainerRef = useRef<TrainerSource | null>(trainer)
  const trainerDetailsRef = useRef<RideTrainerDetails | null>(trainerDetails)
  const sourceRef = useRef<RideTrainerSource>(source)
  const connectingRef = useRef(false)
  const selectingTrainerRef = useRef(false)
  const connectionRunRef = useRef(0)
  const autoConnectAttemptedRef = useRef(false)

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
    trainerDetailsRef.current = trainerDetails
  }, [trainerDetails])

  useEffect(() => {
    sourceRef.current = source
  }, [source])

  const cancelConnection = useCallback(async (): Promise<void> => {
    const wasConnecting = connectingRef.current || selectingTrainerRef.current
    connectionRunRef.current += 1
    connectingRef.current = false
    selectingTrainerRef.current = false
    setConnecting(false)
    setSelectingTrainer(false)
    if (wasConnecting && session) {
      try {
        await session.disconnectTrainer({ clearError: true })
      } catch {
        // Best effort
      }
      setTrainer(null)
      setTrainerDetails(null)
      setPendingTrainerDetails(null)
      setSource("none")
      setConnectionError(null)
    }
  }, [session])

  const resetLocalConnectionState = useCallback(() => {
    setTrainer(null)
    setTrainerDetails(null)
    setPendingTrainerDetails(null)
    setSource("none")
    setConnectionError(null)
  }, [])

  const connectWithDevice = useCallback(
    async (
      device: BluetoothDevice,
      runId: number
    ): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }

      const savedBleTrainer = createSavedTrainer(device)
      const details = toTrainerDetails("ble", savedBleTrainer)

      connectingRef.current = true
      setConnecting(true)
      setPendingTrainerDetails(details)
      setConnectionError(null)

      try {
        const nextTrainer = createBleTrainer(device)
        const result = await session.connectTrainer(nextTrainer)

        if (connectionRunRef.current !== runId) {
          return {
            ok: false,
            error: { code: "transport", message: "Connection superseded." },
          }
        }

        if (!result.ok) {
          setConnectionError(result.error)
          return result
        }

        setTrainer(nextTrainer)
        setSource("ble")
        setTrainerDetails(details)
        if (savedBleTrainer?.id) {
          writeSavedTrainer(savedBleTrainer)
        }
        setConnectionError(null)
        return result
      } finally {
        if (connectionRunRef.current === runId) {
          connectingRef.current = false
          setConnecting(false)
          setPendingTrainerDetails(null)
        }
      }
    },
    [session]
  )

  const connectTrainer =
    // fallow-ignore-next-line complexity
    useCallback(async (): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }

      if (selectingTrainerRef.current || connectingRef.current) {
        if (selectingTrainerRef.current) {
          return {
            ok: false,
            error: {
              code: "transport",
              message: "Connection already running.",
            },
          }
        }
        connectionRunRef.current += 1
        connectingRef.current = false
        setConnecting(false)
        try {
          await session.disconnectTrainer({ clearError: true })
        } catch {
          // Best effort cleanup of the superseded attempt.
        }
        resetLocalConnectionState()
      }

      if (!bleAvailable) {
        const error: TrainerError = {
          code: "unsupported",
          message: "Web Bluetooth requires a Chromium-class browser.",
        }
        setConnectionError(error)
        return { ok: false, error }
      }

      const runId = connectionRunRef.current + 1
      connectionRunRef.current = runId
      selectingTrainerRef.current = true
      setSelectingTrainer(true)
      setConnectionError(null)

      try {
        const device = await requestBleDevice()
        if (connectionRunRef.current !== runId) {
          return {
            ok: false,
            error: { code: "transport", message: "Connection superseded." },
          }
        }
        selectingTrainerRef.current = false
        setSelectingTrainer(false)
        return await connectWithDevice(device, runId)
      } catch (error: unknown) {
        const trainerError = toTrainerError(error, cancelledSelectionError)
        setConnectionError(
          trainerError.code === "cancelled" ? null : trainerError
        )
        return { ok: false, error: trainerError }
      } finally {
        if (connectionRunRef.current === runId) {
          selectingTrainerRef.current = false
          setSelectingTrainer(false)
        }
      }
    }, [bleAvailable, connectWithDevice, session])

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
        setConnectionError(error)
        return { ok: false, error }
      }

      const runId = connectionRunRef.current + 1
      connectionRunRef.current = runId
      const details = toTrainerDetails("simulated", null)

      connectingRef.current = true
      setConnecting(true)
      setPendingTrainerDetails(details)
      setConnectionError(null)

      try {
        const result = await session.connectTrainer(simulatedTrainer)

        if (connectionRunRef.current !== runId) {
          return {
            ok: false,
            error: { code: "transport", message: "Connection superseded." },
          }
        }

        if (!result.ok) {
          setConnectionError(result.error)
          return result
        }

        setTrainer(simulatedTrainer)
        setSource("simulated")
        setTrainerDetails(details)
        setConnectionError(null)
        return result
      } finally {
        if (connectionRunRef.current === runId) {
          connectingRef.current = false
          setConnecting(false)
          setPendingTrainerDetails(null)
        }
      }
    }, [session])

  const disconnectTrainer = useCallback(async (): Promise<void> => {
    if (!session) return
    connectionRunRef.current += 1
    await session.disconnectTrainer({ clearError: true })
    setTrainer(null)
    setTrainerDetails(null)
    setPendingTrainerDetails(null)
    setSource("none")
    setConnectionError(null)
  }, [session])

  // Auto-connect: on mount, try to reconnect to the last used trainer
  useEffect(() => {
    if (!session || autoConnectAttemptedRef.current) return
    autoConnectAttemptedRef.current = true

    const savedTrainer = readSavedTrainer()
    if (!savedTrainer) return

    const runId = connectionRunRef.current + 1
    connectionRunRef.current = runId

    const attemptAutoConnect = async () => {
      try {
        const devices = await getGrantedBleDevices()
        if (connectionRunRef.current !== runId) return

        const device = findSavedBleDevice(devices, savedTrainer)
        if (!device) {
          clearSavedTrainer()
          return
        }

        const result = await connectWithDevice(device, runId)
        if (!result.ok && connectionRunRef.current === runId) {
          await session.disconnectTrainer({ clearError: true })
          resetLocalConnectionState()
          if (shouldClearSavedTrainerAfterAutoFailure(result.error)) {
            clearSavedTrainer()
          }
        }
      } catch {
        // Auto-connect is best effort — silently fail
      }
    }

    void attemptAutoConnect()
  }, [session, connectWithDevice, resetLocalConnectionState])

  const reconnect = useCallback(async (): Promise<RideConnectionResult> => {
    if (!session) return { ok: false, error: initializingConnectionError }
    const activeTrainer = trainerRef.current
    const activeSource = sourceRef.current
    if (activeTrainer && activeSource !== "none") {
      const runId = connectionRunRef.current + 1
      connectionRunRef.current = runId
      const details =
        trainerDetailsRef.current ?? toTrainerDetails(activeSource, null)

      connectingRef.current = true
      setConnecting(true)
      setPendingTrainerDetails(details)

      try {
        const result = await session.connectTrainer(activeTrainer)
        if (connectionRunRef.current !== runId) {
          return {
            ok: false,
            error: { code: "transport", message: "Connection superseded." },
          }
        }
        if (!result.ok) {
          setConnectionError(result.error)
          return result
        }
        setTrainerDetails(details)
        setConnectionError(null)
        return result
      } finally {
        if (connectionRunRef.current === runId) {
          connectingRef.current = false
          setConnecting(false)
          setPendingTrainerDetails(null)
        }
      }
    }
    return connectTrainer()
  }, [connectTrainer, session])

  const status = toRideConnectionStatus(sessionState)
  const visibleError = sessionState.lastTrainerError ?? connectionError
  const connection: RideExperienceConnection = {
    status,
    reconnect,
    disconnect: disconnectTrainer,
    error: visibleError,
  }
  const displayedTrainerDetails = pendingTrainerDetails ?? trainerDetails
  const simulatorAvailable = Boolean(session && simulatorBySession.has(session))
  const connectionView = createRideConnectionView({
    connection,
    source,
    trainerDetails,
    pendingTrainerDetails,
    localError: connectionError,
    bleAvailable,
    selectingTrainer,
    connecting,
    trainer,
    simulatorAvailable,
  })

  return {
    ready: session !== null,
    session,
    connection,
    connectionView,
    trainer,
    trainerDetails: displayedTrainerDetails,
    bleAvailable,
    source,
    selectingTrainer,
    connecting,
    connectionError: visibleError?.message ?? null,
    connectTrainer,
    useSimulatorTrainer,
    disconnectTrainer,
    cancelConnection,
  }
}

function toTrainerDetails(
  source: Exclude<RideTrainerSource, "none">,
  savedTrainer: RideSavedTrainer | null | undefined
): RideTrainerDetails {
  if (source === "simulated") {
    return { source, name: "Simulated Trainer" }
  }
  return {
    source,
    name: savedTrainer?.name?.trim() || "Bluetooth trainer",
  }
}

function shouldClearSavedTrainerAfterAutoFailure(error: TrainerError): boolean {
  return error.code === "transport" || error.code === "timeout"
}

export function useRideSimulatorControls(
  runtime: RideRuntimeController
): RideSimulatorControls {
  const simulator =
    runtime.session && runtime.source === "simulated" && import.meta.env.DEV
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

function useOptionalRideSessionState(
  session: RideSessionController | null
): RideSessionState {
  return useSyncExternalStore(
    session?.subscribe ?? (() => () => undefined),
    () => session?.getState() ?? disconnectedSessionState,
    () => disconnectedSessionState
  )
}

function toRideConnectionStatus(
  state: RideSessionState
): RideExperienceConnection["status"] {
  if (state.trainerConnected) return "connected"
  if (state.telemetry.trainerStatus === "connecting") return "connecting"
  if (state.telemetry.trainerStatus === "error") return "error"
  return "disconnected"
}
