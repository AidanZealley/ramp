import {
  Capability,
  type TrainerCapabilities,
  type TrainerCommand,
} from "@ramp/ride-contracts"
import { Subject } from "../../observable"
import type {
  TrainerConnectionState,
  TrainerError,
  TrainerSource,
  TrainerTelemetryMessage,
} from "../../types"

export const FTMS_SERVICE_UUID = 0x1826
export const FTMS_INDOOR_BIKE_DATA = 0x2ad2
export const FTMS_CONTROL_POINT = 0x2ad9
export const FTMS_FEATURE = 0x2acc
export const WAHOO_PROPRIETARY_SERVICE_UUID =
  "a026ee01-0a7d-4ab3-97fa-f1500f9feb8b"

export class WahooKickrTrainer implements TrainerSource {
  readonly kind = "wahoo-kickr-ble"
  readonly capabilities: TrainerCapabilities = new Set([
    Capability.ReadPower,
    Capability.ReadCadence,
    Capability.ReadSpeed,
  ])
  readonly state: TrainerConnectionState = { kind: "disconnected" }
  private readonly telemetrySubject = new Subject<TrainerTelemetryMessage>()
  private readonly stateSubject = new Subject<TrainerConnectionState>()
  private readonly errorSubject = new Subject<TrainerError>()

  async connect(): Promise<void> {
    throw unsupported()
  }

  async disconnect(): Promise<void> {}

  async sendCommand(_command: TrainerCommand): Promise<void> {
    throw unsupported()
  }

  subscribeTelemetry(listener: (t: TrainerTelemetryMessage) => void): () => void {
    return this.telemetrySubject.subscribe(listener)
  }

  subscribeState(listener: (s: TrainerConnectionState) => void): () => void {
    return this.stateSubject.subscribe(listener)
  }

  subscribeError(listener: (e: TrainerError) => void): () => void {
    return this.errorSubject.subscribe(listener)
  }
}

function unsupported(): TrainerError {
  return {
    code: "unsupported",
    message: "Live Wahoo Kickr BLE transport is deferred for the prototype.",
  }
}
