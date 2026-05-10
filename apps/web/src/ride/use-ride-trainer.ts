import { useEffect, useMemo, useRef, useState } from "react"
import {
  SimulatedTrainer,
  isWebBluetoothAvailable,
  requestBleTrainer,
} from "@ramp/trainer-io"
import type { SimulatedRider, TrainerSource } from "@ramp/trainer-io"
import { rideDevSimulationEnabled } from "./dev-simulation-config"

export type RideTrainerSource = "none" | "simulated" | "ble"

export type RideTrainerController = {
  trainer: TrainerSource | null
  source: RideTrainerSource
  devSimulationEnabled: boolean
  bleAvailable: boolean
  selectingBleTrainer: boolean
  simulatedTrainer: SimulatedTrainer | null
  simulatedRider: SimulatedRider | null
  connectBleTrainer: () => Promise<boolean>
  useSimulatedTrainer: () => Promise<void>
  disconnectTrainer: () => Promise<void>
}

export function useRideTrainer(): RideTrainerController {
  const simulatedTrainer = useMemo(
    () => (rideDevSimulationEnabled ? new SimulatedTrainer() : null),
    []
  )
  const [trainer, setTrainer] = useState<TrainerSource | null>(
    rideDevSimulationEnabled ? simulatedTrainer : null
  )
  const [source, setSource] = useState<RideTrainerSource>(
    rideDevSimulationEnabled ? "simulated" : "none"
  )
  const [selectingBleTrainer, setSelectingBleTrainer] = useState(false)
  const trainerRef = useRef<TrainerSource | null>(trainer)
  const selectingBleTrainerRef = useRef(false)
  const bleAvailable = isWebBluetoothAvailable()

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
    selectingBleTrainer,
    async connectBleTrainer() {
      if (!bleAvailable || selectingBleTrainerRef.current) return false
      selectingBleTrainerRef.current = true
      setSelectingBleTrainer(true)
      try {
        const nextTrainer = await requestBleTrainer()
        await trainerRef.current?.disconnect()
        setTrainer(nextTrainer)
        setSource("ble")
        return true
      } catch {
        return false
      } finally {
        selectingBleTrainerRef.current = false
        setSelectingBleTrainer(false)
      }
    },
    async useSimulatedTrainer() {
      if (!simulatedTrainer) return
      await trainerRef.current?.disconnect()
      setTrainer(simulatedTrainer)
      setSource("simulated")
    },
    async disconnectTrainer() {
      await trainerRef.current?.disconnect()
      setTrainer(null)
      setSource("none")
    },
  }
}
