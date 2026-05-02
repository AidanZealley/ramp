import { useEffect, useMemo, useRef, useState } from "react"
import {
  MockTrainer,
  isWebBluetoothAvailable,
  requestBleTrainer,
} from "@ramp/trainer-io"
import type { TrainerSource } from "@ramp/trainer-io"

export type RideTrainerController = {
  trainer: TrainerSource
  bleAvailable: boolean
  selectingBleTrainer: boolean
  connectBleTrainer: () => Promise<boolean>
  useMockTrainer: () => Promise<void>
}

export function useRideTrainer(): RideTrainerController {
  const mockTrainer = useMemo(() => new MockTrainer(), [])
  const [trainer, setTrainer] = useState<TrainerSource>(mockTrainer)
  const [selectingBleTrainer, setSelectingBleTrainer] = useState(false)
  const trainerRef = useRef<TrainerSource>(mockTrainer)
  const selectingBleTrainerRef = useRef(false)
  const bleAvailable = isWebBluetoothAvailable()

  useEffect(() => {
    trainerRef.current = trainer
  }, [trainer])

  return {
    trainer,
    bleAvailable,
    selectingBleTrainer,
    async connectBleTrainer() {
      if (!bleAvailable || selectingBleTrainerRef.current) return false
      selectingBleTrainerRef.current = true
      setSelectingBleTrainer(true)
      try {
        const nextTrainer = await requestBleTrainer()
        // Disconnect the old trainer before switching to avoid orphaned BLE
        // subscriptions during the gap before session cleanup runs.
        await trainerRef.current.disconnect()
        setTrainer(nextTrainer)
        return true
      } catch {
        return false
      } finally {
        selectingBleTrainerRef.current = false
        setSelectingBleTrainer(false)
      }
    },
    async useMockTrainer() {
      await trainerRef.current.disconnect()
      setTrainer(mockTrainer)
    },
  }
}
