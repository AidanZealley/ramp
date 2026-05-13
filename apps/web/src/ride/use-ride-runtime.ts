import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createRideSession, useRideSelector } from "@ramp/ride-core"
import {
  canUseBleTrainerSource,
  createSimulatedTrainerSource,
  requestBleTrainerSource,
} from "./trainer-sources"
import { rideDevSimulationEnabled } from "./dev-simulation-config"
import type {
  RideConnectionResult,
  RideExperienceConnection,
  RideSessionController,
} from "@ramp/ride-core"
import type {
  SimulatedRider,
  SimulatedTrainer,
  TrainerSource,
} from "./trainer-sources"

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
    () => (rideDevSimulationEnabled ? createSimulatedTrainerSource() : null),
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
  const connectionErrorRef = useRef<string | null>(null)
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

  const setSource = useCallback((nextSource: RideTrainerSource) => {
    sourceRef.current = nextSource
    setSourceState(nextSource)
  }, [])

  const setConnectionErrorState = useCallback((message: string | null) => {
    connectionErrorRef.current = message
    setConnectionError(message)
  }, [])

  const connectTrainer = useCallback(
    async (
      nextTrainer: TrainerSource,
      nextSource: RideTrainerSource
    ): Promise<boolean> => {
      const previousTrainer = trainerRef.current
      const previousSource = sourceRef.current
      const result = await session.connectTrainer(nextTrainer)
      if (!result.ok) {
        setConnectionErrorState(result.error.message)
        setTrainer(previousTrainer)
        trainerRef.current = previousTrainer
        setSource(previousSource)
        return false
      }
      setTrainer(nextTrainer)
      trainerRef.current = nextTrainer
      setSource(nextSource)
      setConnectionErrorState(null)
      return true
    },
    [session, setConnectionErrorState, setSource]
  )

  const connectBleTrainer = useCallback(async (): Promise<boolean> => {
    if (selectingBleTrainerRef.current || connectingRef.current) return false
    if (!bleAvailable) {
      setConnectionErrorState(
        "Web Bluetooth requires a Chromium-class browser."
      )
      return false
    }
    selectingBleTrainerRef.current = true
    connectingRef.current = true
    setSelectingBleTrainer(true)
    setConnecting(true)
    setConnectionErrorState(null)
    try {
      const nextTrainer = await requestBleTrainerSource()
      const connected = await connectTrainer(nextTrainer, "ble")
      if (connected) setSelectedSource("ble")
      return connected
    } catch {
      setConnectionErrorState("Bluetooth trainer selection was cancelled.")
      return false
    } finally {
      selectingBleTrainerRef.current = false
      connectingRef.current = false
      setSelectingBleTrainer(false)
      setConnecting(false)
    }
  }, [bleAvailable, connectTrainer, setConnectionErrorState])

  const useSimulatedTrainer = useCallback(async (): Promise<boolean> => {
    if (connectingRef.current) return false
    if (!simulatedTrainer) {
      setConnectionErrorState("The ride simulator is not available.")
      return false
    }
    connectingRef.current = true
    setConnecting(true)
    setConnectionErrorState(null)
    try {
      const connected = await connectTrainer(simulatedTrainer, "simulated")
      if (connected) setSelectedSource("simulated")
      return connected
    } finally {
      connectingRef.current = false
      setConnecting(false)
    }
  }, [connectTrainer, setConnectionErrorState, simulatedTrainer])

  const connectSelectedTrainer = useCallback(async (): Promise<boolean> => {
    if (selectedSource === "simulated") return useSimulatedTrainer()
    if (selectedSource === "ble") return connectBleTrainer()
    setConnectionErrorState("Choose a trainer source before starting.")
    return false
  }, [
    connectBleTrainer,
    selectedSource,
    setConnectionErrorState,
    useSimulatedTrainer,
  ])

  const disconnectTrainer = useCallback(async (): Promise<void> => {
    await session.disconnectTrainer()
    setTrainer(null)
    trainerRef.current = null
    setSource("none")
  }, [session, setSource])

  const reconnect = useCallback(async (): Promise<RideConnectionResult> => {
    const activeTrainer = trainerRef.current
    if (activeTrainer) {
      connectingRef.current = true
      setConnecting(true)
      try {
        const result = await session.connectTrainer(activeTrainer)
        if (!result.ok) setConnectionErrorState(result.error.message)
        return result
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to reconnect trainer."
        const result: RideConnectionResult = {
          ok: false,
          error: { code: "transport", message },
        }
        setConnectionErrorState(message)
        return result
      } finally {
        connectingRef.current = false
        setConnecting(false)
      }
    }

    const ok = await connectSelectedTrainer()
    if (ok) return { ok: true }
    return {
      ok: false,
      error: {
        code: "transport",
        message: connectionErrorRef.current ?? "Unable to reconnect trainer.",
      },
    }
  }, [connectSelectedTrainer, session, setConnectionErrorState])

  useEffect(() => {
    const nextBleAvailable = canUseBleTrainerSource()
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

  const selectSource = useCallback(
    (nextSource: RideTrainerConnectionChoice) => {
      if (nextSource === "simulated" && !rideDevSimulationEnabled) return
      setSelectedSource(nextSource)
      setConnectionErrorState(null)
    },
    [setConnectionErrorState]
  )

  const connection = useMemo<RideExperienceConnection>(
    () => ({
      status: trainerStatus,
      reconnect,
      disconnect: disconnectTrainer,
      error: lastTrainerError,
    }),
    [disconnectTrainer, lastTrainerError, reconnect, trainerStatus]
  )

  return useMemo(
    () => ({
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
      connection,
      selectSource,
      connectSelectedTrainer,
      connectBleTrainer,
      useSimulatedTrainer,
      disconnectTrainer,
    }),
    [
      bleAvailable,
      connectBleTrainer,
      connectSelectedTrainer,
      connecting,
      connection,
      connectionError,
      disconnectTrainer,
      selectSource,
      selectingBleTrainer,
      selectedSource,
      session,
      simulatedTrainer,
      source,
      trainer,
      useSimulatedTrainer,
    ]
  )
}
