import { useEffect, useMemo, useRef, useState } from "react"
import {
  SimulatedTrainer,
  isWebBluetoothAvailable,
  requestBleTrainer,
} from "@ramp/trainer-io"
import { rideDevSimulationEnabled } from "./dev-simulation-config"
import type { SimulatedRider, TrainerSource } from "@ramp/trainer-io"

export type RideTrainerSource = "none" | "simulated" | "ble"
export type RideTrainerConnectionChoice = "simulated" | "ble"

export type RideTrainerController = {
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
  selectSource: (source: RideTrainerConnectionChoice) => void
  connectSelectedTrainer: () => Promise<boolean>
  connectBleTrainer: () => Promise<boolean>
  useSimulatedTrainer: () => Promise<boolean>
  disconnectTrainer: () => Promise<void>
}

export function useRideTrainer(): RideTrainerController {
  const simulatedTrainer = useMemo(
    () => (rideDevSimulationEnabled ? new SimulatedTrainer() : null),
    []
  )
  const [trainer, setTrainer] = useState<TrainerSource | null>(null)
  const [source, setSource] = useState<RideTrainerSource>("none")
  const [selectedSource, setSelectedSource] =
    useState<RideTrainerConnectionChoice | null>(
      rideDevSimulationEnabled
        ? "simulated"
        : isWebBluetoothAvailable()
          ? "ble"
          : null
    )
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [selectingBleTrainer, setSelectingBleTrainer] = useState(false)
  const trainerRef = useRef<TrainerSource | null>(trainer)
  const selectingBleTrainerRef = useRef(false)
  const connectingRef = useRef(false)
  const bleAvailable = isWebBluetoothAvailable()

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
      await trainerRef.current?.disconnect()
      setTrainer(nextTrainer)
      setSource("ble")
      setSelectedSource("ble")
      return true
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
      await trainerRef.current?.disconnect()
      setTrainer(simulatedTrainer)
      setSource("simulated")
      setSelectedSource("simulated")
      return true
    } catch {
      setConnectionError("Could not start the ride simulator.")
      return false
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
    await trainerRef.current?.disconnect()
    setTrainer(null)
    setSource("none")
  }

  useEffect(() => {
    trainerRef.current = trainer
  }, [trainer])

  return {
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
