import {
  SimulatedTrainer,
  isWebBluetoothAvailable,
  requestBleTrainer,
} from "@ramp/trainer-io"
import type { SimulatedRider, TrainerSource } from "@ramp/trainer-io"

export function createSimulatedTrainerSource(): SimulatedTrainer {
  return new SimulatedTrainer()
}

export function canUseBleTrainerSource(): boolean {
  return isWebBluetoothAvailable()
}

export async function requestBleTrainerSource(): Promise<TrainerSource> {
  return requestBleTrainer()
}

export type { SimulatedRider, SimulatedTrainer, TrainerSource }
