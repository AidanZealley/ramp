import { useMemo, useState } from "react"
import {
  isWebBluetoothAvailable,
  MockTrainer,
  requestBleTrainer,
} from "@ramp/trainer-io"
import type { TrainerSource } from "@ramp/trainer-io"

export type RideTrainerController = {
  trainer: TrainerSource
  bleAvailable: boolean
  selectingBleTrainer: boolean
  connectBleTrainer: () => Promise<boolean>
  useMockTrainer: () => void
}

export function useRideTrainer(): RideTrainerController {
  const mockTrainer = useMemo(() => new MockTrainer(), [])
  const [trainer, setTrainer] = useState<TrainerSource>(mockTrainer)
  const [selectingBleTrainer, setSelectingBleTrainer] = useState(false)
  const bleAvailable = isWebBluetoothAvailable()

  return {
    trainer,
    bleAvailable,
    selectingBleTrainer,
    async connectBleTrainer() {
      if (!bleAvailable || selectingBleTrainer) return false
      setSelectingBleTrainer(true)
      try {
        const nextTrainer = await requestBleTrainer()
        setTrainer(nextTrainer)
        return true
      } catch {
        return false
      } finally {
        setSelectingBleTrainer(false)
      }
    },
    useMockTrainer() {
      setTrainer(mockTrainer)
    },
  }
}
