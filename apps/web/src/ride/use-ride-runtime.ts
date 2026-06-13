import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { createRideSession } from "@ramp/ride-core"
import {
  FtmsBleTrainer,
  SimulatedTrainer,
  getGrantedBleDevices,
  isWebBluetoothAvailable,
  requestBleDevice,
} from "@ramp/trainer-io"
import { toTrainerError } from "@ramp/ride-contracts"
import type {
  RideConnectionResult,
  RideSessionController,
  RideSessionState,
} from "@ramp/ride-core"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type {
  RiderPowerMode,
  SimulatedRiderState,
  SimulatedTrainerMode,
  SimulatedTrainerState,
  TrainerError,
  TrainerSource,
} from "@ramp/trainer-io"

export type RideTrainerSource = "none" | "simulated" | "ble"

export type RideAutoConnectStatus =
  | "idle"
  | "checking"
  | "connecting"
  | "cancelled"
  | "failed"
  | "unavailable"
  | "succeeded"

export type RideSavedTrainer = {
  id: string
  name: string | null
}

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
  autoConnect: {
    status: RideAutoConnectStatus
    attempted: boolean
    suppressed: boolean
    lastTrainer: RideSavedTrainer | null
    error: string | null
    cancel: () => Promise<void>
  }
  suppressAutoConnect: () => void
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

const lastBleTrainerStorageKey = "ramp:lastBleTrainer"

type AutoConnectState = {
  status: RideAutoConnectStatus
  attempted: boolean
  suppressed: boolean
  error: string | null
}

export function useRideRuntime(): RideRuntimeController {
  const [session, setSession] = useState<RideSessionController | null>(null)
  const [trainer, setTrainer] = useState<TrainerSource | null>(null)
  const [source, setSource] = useState<RideTrainerSource>("none")
  const [bleAvailable, setBleAvailable] = useState(false)
  const [lastTrainer, setLastTrainer] = useState<RideSavedTrainer | null>(() =>
    readSavedTrainer()
  )
  const [autoConnectState, setAutoConnectState] = useState<AutoConnectState>({
    status: "idle",
    attempted: false,
    suppressed: false,
    error: null,
  })
  const [connectionError, setConnectionError] = useState<TrainerError | null>(
    null
  )
  const [connecting, setConnecting] = useState(false)
  const [selectingTrainer, setSelectingTrainer] = useState(false)
  const sessionState = useOptionalRideSessionState(session)
  const trainerRef = useRef<TrainerSource | null>(trainer)
  const sourceRef = useRef<RideTrainerSource>(source)
  const connectingRef = useRef(false)
  const selectingTrainerRef = useRef(false)
  const connectionRunRef = useRef(0)
  const autoConnectRunRef = useRef(0)
  const autoConnectStateRef = useRef(autoConnectState)

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

  const updateAutoConnectState = useCallback(
    (update: (previous: AutoConnectState) => AutoConnectState) => {
      setAutoConnectState((previous) => {
        const next = update(previous)
        autoConnectStateRef.current = next
        return next
      })
    },
    []
  )

  useEffect(() => {
    trainerRef.current = trainer
  }, [trainer])

  useEffect(() => {
    sourceRef.current = source
  }, [source])

  const attachTrainer = useCallback(
    async (
      nextTrainer: TrainerSource,
      nextSource: Exclude<RideTrainerSource, "none">,
      options: {
        runId?: number
        savedBleTrainer?: RideSavedTrainer | null
      } = {}
    ): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }
      const runId = options.runId ?? connectionRunRef.current + 1
      connectionRunRef.current = runId
      connectingRef.current = true
      setConnecting(true)
      setConnectionError(null)
      try {
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
        setSource(nextSource)
        if (nextSource === "ble" && options.savedBleTrainer?.id) {
          writeSavedTrainer(options.savedBleTrainer)
          setLastTrainer(options.savedBleTrainer)
        }
        setConnectionError(null)
        return result
      } finally {
        if (connectionRunRef.current === runId) {
          connectingRef.current = false
          setConnecting(false)
        }
      }
    },
    [session]
  )

  const suppressAutoConnect = useCallback(() => {
    autoConnectRunRef.current += 1
    connectionRunRef.current += 1
    updateAutoConnectState((previous) => ({
      ...previous,
      suppressed: true,
    }))
  }, [updateAutoConnectState])

  const cancelAutoConnect = useCallback(async (): Promise<void> => {
    const wasActive =
      autoConnectStateRef.current.status === "checking" ||
      autoConnectStateRef.current.status === "connecting"
    autoConnectRunRef.current += 1
    connectionRunRef.current += 1
    connectingRef.current = false
    setConnecting(false)
    updateAutoConnectState((previous) => ({
      ...previous,
      status: "cancelled",
      attempted: true,
      suppressed: true,
      error: null,
    }))
    if (wasActive && session) {
      try {
        await session.disconnectTrainer({ clearError: true })
      } catch {
        // Best effort; connection attempts can be in-flight during cancellation.
      }
      setTrainer(null)
      setSource("none")
      setConnectionError(null)
    }
  }, [session, updateAutoConnectState])

  const cancelActiveAutoConnect = useCallback(async () => {
    if (
      autoConnectStateRef.current.status === "checking" ||
      autoConnectStateRef.current.status === "connecting"
    ) {
      await cancelAutoConnect()
    }
  }, [cancelAutoConnect])

  const connectTrainer =
    useCallback(async (): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }
      await cancelActiveAutoConnect()
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
        setConnectionError(error)
        return { ok: false, error }
      }
      selectingTrainerRef.current = true
      setSelectingTrainer(true)
      setConnectionError(null)
      try {
        const device = await requestBleDevice()
        const nextTrainer = new FtmsBleTrainer({ device })
        return await attachTrainer(nextTrainer, "ble", {
          savedBleTrainer: createSavedTrainer(device),
        })
      } catch (error: unknown) {
        const trainerError = toTrainerError(error, cancelledSelectionError)
        setConnectionError(trainerError)
        return { ok: false, error: trainerError }
      } finally {
        selectingTrainerRef.current = false
        setSelectingTrainer(false)
      }
    }, [attachTrainer, bleAvailable, cancelActiveAutoConnect, session])

  const useSimulatorTrainer =
    useCallback(async (): Promise<RideConnectionResult> => {
      if (!session) return { ok: false, error: initializingConnectionError }
      await cancelActiveAutoConnect()
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
      return attachTrainer(simulatedTrainer, "simulated")
    }, [attachTrainer, cancelActiveAutoConnect, session])

  const disconnectTrainer = useCallback(async (): Promise<void> => {
    if (!session) return
    suppressAutoConnect()
    await session.disconnectTrainer({ clearError: true })
    setTrainer(null)
    setSource("none")
    setConnectionError(null)
  }, [session, suppressAutoConnect])

  useEffect(() => {
    if (
      !session ||
      !lastTrainer ||
      autoConnectStateRef.current.attempted ||
      autoConnectStateRef.current.suppressed
    ) {
      return
    }

    const runId = connectionRunRef.current + 1
    connectionRunRef.current = runId
    autoConnectRunRef.current = runId

    const updateIfCurrent = (
      update: (previous: AutoConnectState) => AutoConnectState
    ) => {
      if (autoConnectRunRef.current !== runId) return
      updateAutoConnectState(update)
    }

    const connectSavedTrainer = async () => {
      updateIfCurrent((previous) => ({
        ...previous,
        status: "checking",
        attempted: true,
        error: null,
      }))

      try {
        const devices = await getGrantedBleDevices()
        if (autoConnectRunRef.current !== runId) return
        const device = devices.find(
          (candidate) => candidate.id === lastTrainer.id
        )
        if (!device) {
          updateIfCurrent((previous) => ({
            ...previous,
            status: "failed",
            error:
              "The saved trainer is not available. Connect manually to continue.",
          }))
          return
        }

        updateIfCurrent((previous) => ({
          ...previous,
          status: "connecting",
          error: null,
        }))
        const result = await attachTrainer(new FtmsBleTrainer({ device }), "ble", {
          runId,
          savedBleTrainer: createSavedTrainer(device),
        })
        if (autoConnectRunRef.current !== runId) return
        if (result.ok) {
          updateIfCurrent((previous) => ({
            ...previous,
            status: "succeeded",
            error: null,
          }))
        } else {
          updateIfCurrent((previous) => ({
            ...previous,
            status: "failed",
            error: result.error.message,
          }))
        }
      } catch (error: unknown) {
        if (autoConnectRunRef.current !== runId) return
        const trainerError = toTrainerError(error)
        updateIfCurrent((previous) => ({
          ...previous,
          status:
            trainerError.code === "unsupported" ? "unavailable" : "failed",
          error: trainerError.message,
        }))
      }
    }

    void connectSavedTrainer()
  }, [attachTrainer, lastTrainer, session, updateAutoConnectState])

  const reconnect = useCallback(async (): Promise<RideConnectionResult> => {
    if (!session) return { ok: false, error: initializingConnectionError }
    const activeTrainer = trainerRef.current
    const activeSource = sourceRef.current
    if (activeTrainer && activeSource !== "none") {
      return attachTrainer(activeTrainer, activeSource)
    }
    return connectTrainer()
  }, [attachTrainer, connectTrainer, session])

  const status = toRideConnectionStatus(sessionState)
  const visibleError = sessionState.lastTrainerError ?? connectionError

  return {
    ready: session !== null,
    session,
    connection: {
      status,
      reconnect,
      disconnect: disconnectTrainer,
      error: visibleError,
    },
    trainer,
    bleAvailable,
    source,
    selectingTrainer,
    connecting,
    connectionError: visibleError?.message ?? null,
    autoConnect: {
      ...autoConnectState,
      lastTrainer,
      cancel: cancelAutoConnect,
    },
    suppressAutoConnect,
    connectTrainer,
    useSimulatorTrainer,
    disconnectTrainer,
  }
}

function readSavedTrainer(): RideSavedTrainer | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(lastBleTrainerStorageKey)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<RideSavedTrainer>
    if (typeof parsed.id !== "string" || parsed.id.length === 0) return null
    return {
      id: parsed.id,
      name: typeof parsed.name === "string" ? parsed.name : null,
    }
  } catch {
    return null
  }
}

function writeSavedTrainer(savedTrainer: RideSavedTrainer): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(
      lastBleTrainerStorageKey,
      JSON.stringify(savedTrainer)
    )
  } catch {
    // Best effort only; persistence should not block an active ride.
  }
}

function createSavedTrainer(device: BluetoothDevice): RideSavedTrainer | null {
  if (!device.id) return null
  return {
    id: device.id,
    name: device.name ?? null,
  }
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
