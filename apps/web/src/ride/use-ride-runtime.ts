import { useEffect, useMemo, useRef, useState } from "react"
import { createRideSession, useRideSelector } from "@ramp/ride-core"
import {
  SimulatedTrainer,
  isWebBluetoothAvailable,
  requestBleTrainer,
} from "@ramp/trainer-io"
import { rideDevSimulationEnabled } from "./dev-simulation-config"
import type {
  RideConnectionResult,
  RideExperienceConnection,
  RideSessionController,
} from "@ramp/ride-core"
import type { SimulatedRider, TrainerSource } from "@ramp/trainer-io"

export type RideTrainerSource = "none" | "simulated" | "ble"
export type RideTrainerConnectionChoice = "simulated" | "ble"

export type RideRuntime = {
  session: RideSessionController
  trainer: TrainerSource | null
  source: RideTrainerSource
  selectedSource: RideTrainerConnectionChoice | null
  devSimulationEnabled: boolean
  bleAvailable: boolean
  selectingBleTrainer: boolean
  connecting: boolean
  connectionError: string | null
  simulatedTrainer: SimulatedTrainer | null
  simulatedRider: SimulatedRider | null
  connection: RideExperienceConnection
  selectSource: (source: RideTrainerConnectionChoice) => void
  connectSelectedTrainer: () => Promise<boolean>
  connectBleTrainer: () => Promise<boolean>
  useSimulatedTrainer: () => Promise<boolean>
  disconnectTrainer: () => Promise<void>
}

export function useRideRuntime(): RideRuntime {
  const session = useMemo(() => createRideSession(), [])
  const simulatedTrainer = useMemo(
    () => (rideDevSimulationEnabled ? new SimulatedTrainer() : null),
    []
  )
  const [trainer, setTrainer] = useState<TrainerSource | null>(null)
  const trainerRef = useRef<TrainerSource | null>(null)
  const sourceRef = useRef<RideTrainerSource>("none")
  const [source, setSourceState] = useState<RideTrainerSource>("none")
  const [selectedSource, setSelectedSource] =
    useState<RideTrainerConnectionChoice | null>(
      rideDevSimulationEnabled ? "simulated" : null
    )
  const [bleAvailable, setBleAvailable] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [selectingBleTrainer, setSelectingBleTrainer] = useState(false)
  const disposeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectingRef = useRef(false)
  const selectingBleTrainerRef = useRef(false)
  const trainerStatus = useRideSelector(
    session,
    (state) => state.telemetry.trainerStatus
  )
  const lastTrainerError = useRideSelector(
    session,
    (state) => state.lastTrainerError
  )

  const setSource = (nextSource: RideTrainerSource) => {
    sourceRef.current = nextSource
    setSourceState(nextSource)
  }

  const connectTrainer = async (
    nextTrainer: TrainerSource,
    nextSource: RideTrainerSource
  ): Promise<boolean> => {
    const result = await session.connectTrainer(nextTrainer)
    if (!result.ok) {
      setConnectionError(result.error.message)
      setTrainer(null)
      trainerRef.current = null
      setSource("none")
      return false
    }
    setTrainer(nextTrainer)
    trainerRef.current = nextTrainer
    setSource(nextSource)
    setConnectionError(null)
    return true
  }

  const connectBleTrainer = async (): Promise<boolean> => {
    if (selectingBleTrainerRef.current || connectingRef.current) return false
    if (!bleAvailable) {
      setConnectionError("Web Bluetooth requires a Chromium-class browser.")
      return false
    }
    selectingBleTrainerRef.current = true
    connectingRef.current = true
    setSelectingBleTrainer(true)
    setConnecting(true)
    setConnectionError(null)
    try {
      const nextTrainer = await requestBleTrainer()
      const connected = await connectTrainer(nextTrainer, "ble")
      if (connected) setSelectedSource("ble")
      return connected
    } catch {
      setConnectionError("Bluetooth trainer selection was cancelled.")
      return false
    } finally {
      selectingBleTrainerRef.current = false
      connectingRef.current = false
      setSelectingBleTrainer(false)
      setConnecting(false)
    }
  }

  const useSimulatedTrainer = async (): Promise<boolean> => {
    if (connectingRef.current) return false
    if (!simulatedTrainer) {
      setConnectionError("The ride simulator is not available.")
      return false
    }
    connectingRef.current = true
    setConnecting(true)
    setConnectionError(null)
    try {
      const connected = await connectTrainer(simulatedTrainer, "simulated")
      if (connected) setSelectedSource("simulated")
      return connected
    } finally {
      connectingRef.current = false
      setConnecting(false)
    }
  }

  const connectSelectedTrainer = async (): Promise<boolean> => {
    if (selectedSource === "simulated") return useSimulatedTrainer()
    if (selectedSource === "ble") return connectBleTrainer()
    setConnectionError("Choose a trainer source before starting.")
    return false
  }

  const disconnectTrainer = async (): Promise<void> => {
    await session.disconnectTrainer()
    setTrainer(null)
    trainerRef.current = null
    setSource("none")
  }

  const reconnect = async (): Promise<RideConnectionResult> => {
    const activeTrainer = trainerRef.current
    if (activeTrainer) {
      connectingRef.current = true
      setConnecting(true)
      const result = await session.connectTrainer(activeTrainer)
      connectingRef.current = false
      setConnecting(false)
      if (!result.ok) setConnectionError(result.error.message)
      return result
    }

    const ok = await connectSelectedTrainer()
    return ok
      ? { ok: true }
      : {
          ok: false,
          error: {
            code: "transport",
            message: connectionError ?? "Unable to reconnect trainer.",
          },
        }
  }

  useEffect(() => {
    const nextBleAvailable = isWebBluetoothAvailable()
    setBleAvailable(nextBleAvailable)
    if (!rideDevSimulationEnabled && nextBleAvailable) {
      setSelectedSource((current) => current ?? "ble")
    }
  }, [])

  useEffect(() => {
    if (disposeTimerRef.current) {
      clearTimeout(disposeTimerRef.current)
      disposeTimerRef.current = null
    }
    return () => {
      disposeTimerRef.current = setTimeout(() => {
        disposeTimerRef.current = null
        void session.dispose()
      }, 0)
    }
  }, [session])

  return {
    session,
    trainer,
    bleAvailable,
    devSimulationEnabled: rideDevSimulationEnabled,
    simulatedTrainer,
    simulatedRider: simulatedTrainer?.rider ?? null,
    source,
    selectedSource,
    selectingBleTrainer,
    connecting,
    connectionError,
    connection: {
      status: trainerStatus,
      reconnect,
      disconnect: disconnectTrainer,
      error: lastTrainerError,
    },
    selectSource(nextSource) {
      if (nextSource === "simulated" && !rideDevSimulationEnabled) return
      setSelectedSource(nextSource)
      setConnectionError(null)
    },
    connectSelectedTrainer,
    connectBleTrainer,
    useSimulatedTrainer,
    disconnectTrainer,
  }
}
