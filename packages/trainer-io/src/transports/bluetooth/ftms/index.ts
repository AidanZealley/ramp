import { Capability, validateTrainerCommand } from "@ramp/ride-contracts"
import { Subject } from "../../../observable"
import type {
  TrainerCapabilities,
  TrainerCommand,
  TrainerConnectionState,
  TrainerError,
  TrainerSource,
  TrainerTelemetryMessage,
} from "../../../types"
import { GattService } from "../web-bluetooth/gatt-service"
import { mapWebBluetoothError } from "../web-bluetooth/request-device"
import {
  FITNESS_MACHINE_CONTROL_POINT_CHARACTERISTIC_UUID,
  FITNESS_MACHINE_FEATURE_CHARACTERISTIC_UUID,
  FITNESS_MACHINE_SERVICE_UUID,
  INDOOR_BIKE_DATA_CHARACTERISTIC_UUID,
  SUPPORTED_POWER_RANGE_CHARACTERISTIC_UUID,
  SUPPORTED_RESISTANCE_LEVEL_RANGE_CHARACTERISTIC_UUID,
} from "../web-bluetooth/uuids"
import {
  createInitialBleTrainerDeviceInfo,
  readBleTrainerDeviceInfo,
} from "./device-info"
import type { BleTrainerDeviceInfo } from "./device-info"
import { FtmsControlPointClient } from "./control-point"
import {
  decodeFitnessMachineFeature,
  deriveTrainerCapabilities,
} from "./fitness-machine-feature"
import { decodeFtmsIndoorBikeData } from "./indoor-bike-data"
import {
  decodeSupportedPowerRange,
  decodeSupportedResistanceLevelRange,
} from "./supported-ranges"

export type FtmsBleTrainerOptions = {
  device: BluetoothDevice
  now?: () => number
  requestTimeoutMs?: number
  connectionFactory?: (
    input: FtmsConnectionFactoryInput
  ) => Promise<FtmsConnection>
}

type FtmsConnectionFactoryInput = {
  device: BluetoothDevice
  now: () => number
  requestTimeoutMs: number
  onTelemetry: (telemetry: TrainerTelemetryMessage) => void
  onDisconnected: () => void
  onDeviceInfo: (deviceInfo: BleTrainerDeviceInfo) => void
}

type FtmsConnection = {
  capabilities: TrainerCapabilities
  disconnect: () => Promise<void>
  release: () => Promise<void>
  sendCommand: (command: TrainerCommand) => Promise<void>
}

export class FtmsBleTrainer implements TrainerSource {
  readonly kind = "ftms-ble"
  readonly telemetrySubject = new Subject<TrainerTelemetryMessage>()
  readonly stateSubject = new Subject<TrainerConnectionState>()
  readonly errorSubject = new Subject<TrainerError>()
  capabilities: TrainerCapabilities = new Set()
  state: TrainerConnectionState = { kind: "disconnected" }
  deviceInfo: BleTrainerDeviceInfo

  private readonly now: () => number
  private readonly requestTimeoutMs: number
  private readonly connectionFactory: (
    input: FtmsConnectionFactoryInput
  ) => Promise<FtmsConnection>
  private connection: FtmsConnection | null = null
  private connectGeneration = 0
  private mode: "erg" | "resistance" | "simulation" | "free" = "free"

  constructor(options: FtmsBleTrainerOptions) {
    this.now = options.now ?? (() => Date.now())
    this.requestTimeoutMs = options.requestTimeoutMs ?? 3000
    this.connectionFactory =
      options.connectionFactory ?? createFtmsConnectionFromDevice
    this.deviceInfo = createInitialBleTrainerDeviceInfo(options.device)
    this.device = options.device
  }

  private readonly device: BluetoothDevice

  async connect(): Promise<void> {
    if (this.connection || this.state.kind === "connecting") return
    const generation = ++this.connectGeneration
    console.info("[trainer-io][ftms] connect start", {
      deviceName: this.device.name ?? null,
      deviceId: this.device.id ?? null,
    })
    this.setState({ kind: "connecting" })

    try {
      const connection = await this.connectionFactory({
        device: this.device,
        now: this.now,
        requestTimeoutMs: this.requestTimeoutMs,
        onTelemetry: (telemetry) => {
          this.telemetrySubject.emit(telemetry)
          this.capabilities = mergeReadCapabilities(
            this.capabilities,
            telemetry
          )
        },
        onDisconnected: () => {
          this.handleUnexpectedDisconnect()
        },
        onDeviceInfo: (deviceInfo) => {
          this.deviceInfo = deviceInfo
        },
      })

      if (generation !== this.connectGeneration) {
        await connection.disconnect()
        return
      }

      this.connection = connection
      this.capabilities = connection.capabilities
      console.info("[trainer-io][ftms] connect complete", {
        capabilities: Array.from(connection.capabilities),
        deviceInfo: this.deviceInfo,
      })
      this.setState({ kind: "connected" })
    } catch (error: unknown) {
      const trainerError = mapWebBluetoothError(error, "transport")
      console.error("[trainer-io][ftms] connect failed", trainerError)
      this.errorSubject.emit(trainerError)
      this.setState({ kind: "error", error: trainerError })
      throw trainerError
    }
  }

  async disconnect(): Promise<void> {
    this.connectGeneration += 1
    console.info("[trainer-io][ftms] disconnect")
    const connection = this.connection
    this.connection = null
    try {
      await connection?.release().catch((error: unknown) => {
        console.warn("[trainer-io][ftms] release before disconnect failed", error)
      })
      await connection?.disconnect()
    } finally {
      this.setState({ kind: "disconnected" })
    }
  }

  async sendCommand(command: TrainerCommand): Promise<void> {
    const validation = validateTrainerCommand(command)
    if (!validation.ok) {
      const error: TrainerError = {
        code: "validation",
        message: validation.reason,
      }
      this.errorSubject.emit(error)
      throw error
    }

    const capability = commandCapability(command)
    if (capability && !this.capabilities.has(capability)) {
      const error: TrainerError = {
        code: "command-rejected",
        message: `Unsupported command: ${command.type}`,
      }
      this.errorSubject.emit(error)
      throw error
    }

    if (command.type === "disconnect") {
      await this.disconnect()
      return
    }
    if (command.type === "setMode") {
      this.mode = command.mode
      if (command.mode === "free" && this.connection) {
        try {
          await this.connection.release()
        } catch (error: unknown) {
          const trainerError = mapWebBluetoothError(error, "transport")
          this.errorSubject.emit(trainerError)
          console.error("[trainer-io][ftms] setMode free failed", trainerError)
          throw trainerError
        }
      }
      return
    }
    if (command.type === "requestCalibration") {
      const error: TrainerError = {
        code: "command-rejected",
        message: "Trainer calibration is not implemented for FTMS yet.",
      }
      this.errorSubject.emit(error)
      throw error
    }

    if (!isCommandRoutable(command, this.mode)) {
      const error: TrainerError = {
        code: "command-rejected",
        message: `Command ${command.type} is incompatible with mode ${this.mode}.`,
      }
      this.errorSubject.emit(error)
      throw error
    }
    if (!this.connection) {
      const error: TrainerError = {
        code: "transport",
        message: "Trainer is not connected.",
      }
      this.errorSubject.emit(error)
      throw error
    }

    try {
      console.info("[trainer-io][ftms] sendCommand", command)
      await this.connection.sendCommand(command)
    } catch (error: unknown) {
      const trainerError = mapWebBluetoothError(
        error,
        errorMatchesCode(error, "timeout") ? "timeout" : "transport"
      )
      this.errorSubject.emit(trainerError)
      console.error("[trainer-io][ftms] sendCommand failed", trainerError)
      throw trainerError
    }
  }

  subscribeTelemetry(
    listener: (t: TrainerTelemetryMessage) => void
  ): () => void {
    return this.telemetrySubject.subscribe(listener)
  }

  subscribeState(listener: (s: TrainerConnectionState) => void): () => void {
    return this.stateSubject.subscribe(listener)
  }

  subscribeError(listener: (e: TrainerError) => void): () => void {
    return this.errorSubject.subscribe(listener)
  }

  private setState(state: TrainerConnectionState): void {
    this.state = state
    this.stateSubject.emit(state)
  }

  private handleUnexpectedDisconnect(): void {
    this.connection = null
    const error: TrainerError = {
      code: "transport",
      message: "Trainer disconnected unexpectedly.",
    }
    console.error("[trainer-io][ftms] unexpected disconnect", error)
    this.errorSubject.emit(error)
    this.setState({ kind: "error", error })
    this.setState({ kind: "disconnected" })
  }
}

async function createFtmsConnectionFromDevice(
  input: FtmsConnectionFactoryInput
): Promise<FtmsConnection> {
  const device = input.device
  const gatt = device.gatt
  if (!gatt) {
    throw mapWebBluetoothError({ name: "NotSupportedError" }, "unsupported")
  }

  const disconnectedListener = () => {
    input.onDisconnected()
  }
  device.addEventListener("gattserverdisconnected", disconnectedListener)

  try {
    const server = gatt.connected ? gatt : await gatt.connect()
    console.info("[trainer-io][ftms] gatt connected")
    const service = new GattService(
      await server.getPrimaryService(FITNESS_MACHINE_SERVICE_UUID)
    )
    const indoorBikeData = await service.getCharacteristic(
      INDOOR_BIKE_DATA_CHARACTERISTIC_UUID
    )
    const controlPointCharacteristic = await service.getCharacteristic(
      FITNESS_MACHINE_CONTROL_POINT_CHARACTERISTIC_UUID
    )
    const featureCharacteristic = await service.getCharacteristic(
      FITNESS_MACHINE_FEATURE_CHARACTERISTIC_UUID
    )

    const [featureValue, supportedPowerValue, supportedResistanceValue] =
      await Promise.all([
        featureCharacteristic.readValue(),
        readOptionalCharacteristic(
          service,
          SUPPORTED_POWER_RANGE_CHARACTERISTIC_UUID
        ),
        readOptionalCharacteristic(
          service,
          SUPPORTED_RESISTANCE_LEVEL_RANGE_CHARACTERISTIC_UUID
        ),
      ])

    const feature = decodeFitnessMachineFeature(featureValue)
    const supportedPowerRange = supportedPowerValue
      ? decodeSupportedPowerRange(supportedPowerValue)
      : null
    const supportedResistanceRange = supportedResistanceValue
      ? decodeSupportedResistanceLevelRange(supportedResistanceValue)
      : null
    const capabilities = deriveTrainerCapabilities({
      feature,
      supportedPowerRange,
      supportedResistanceRange,
    })
    console.info("[trainer-io][ftms] feature summary", {
      feature,
      supportedPowerRange,
      supportedResistanceRange,
      capabilities: Array.from(capabilities),
    })

    await indoorBikeData.startNotifications()
    const unsubscribeTelemetry = indoorBikeData.subscribe((value) => {
      const parsed = decodeFtmsIndoorBikeData(value)
      console.debug("[trainer-io][ftms] telemetry", parsed)
      input.onTelemetry({
        ...parsed,
        timestampMs: input.now(),
        source: "ftms-ble",
      })
    })

    const controlPoint = new FtmsControlPointClient(
      controlPointCharacteristic,
      input.requestTimeoutMs
    )
    await controlPoint.start()
    await controlPoint.requestControl()

    const deviceInfo = await readBleTrainerDeviceInfo(device)
    console.info("[trainer-io][ftms] device info", deviceInfo)
    input.onDeviceInfo(deviceInfo)

    return {
      capabilities,
      async release() {
        await releaseTrainerControl(controlPoint, capabilities)
      },
      async disconnect() {
        unsubscribeTelemetry()
        try {
          await releaseTrainerControl(controlPoint, capabilities)
        } catch (error: unknown) {
          console.warn("[trainer-io][ftms] reset during disconnect failed", error)
        }
        await Promise.allSettled([
          indoorBikeData.stopNotifications(),
          controlPoint.stop(),
        ])
        device.removeEventListener(
          "gattserverdisconnected",
          disconnectedListener
        )
        if (gatt.connected) {
          gatt.disconnect()
        }
      },
      async sendCommand(command) {
        await controlPoint.sendCommand(command)
      },
    }
  } catch (error: unknown) {
    device.removeEventListener("gattserverdisconnected", disconnectedListener)
    if (gatt.connected) gatt.disconnect()
    throw mapWebBluetoothError(
      error,
      errorMatchesCode(error, "timeout") ? "timeout" : "transport"
    )
  }
}

async function readOptionalCharacteristic(
  service: GattService,
  characteristicUuid: BluetoothCharacteristicUUID
): Promise<DataView | null> {
  try {
    const characteristic = await service.getCharacteristic(characteristicUuid)
    return await characteristic.readValue()
  } catch {
    return null
  }
}

function commandCapability(command: TrainerCommand): Capability | null {
  if (command.type === "setTargetPower") return Capability.TargetPower
  if (command.type === "setResistance") return Capability.Resistance
  if (command.type === "setSimulationGrade") return Capability.SimulationGrade
  if (command.type === "requestCalibration") return Capability.Calibration
  return null
}

function mergeReadCapabilities(
  previous: TrainerCapabilities,
  telemetry: TrainerTelemetryMessage
): TrainerCapabilities {
  const next = new Set(previous)
  if (telemetry.powerWatts !== null) next.add(Capability.ReadPower)
  if (telemetry.cadenceRpm !== null) next.add(Capability.ReadCadence)
  if (telemetry.speedMps !== null) next.add(Capability.ReadSpeed)
  if (telemetry.heartRateBpm !== null) next.add(Capability.ReadHeartRate)
  return next
}

function errorMatchesCode(error: unknown, code: TrainerError["code"]): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === code
  )
}

function isCommandRoutable(
  command: TrainerCommand,
  _mode: "erg" | "resistance" | "simulation" | "free"
): boolean {
  return (
    command.type === "setTargetPower" ||
    command.type === "setResistance" ||
    command.type === "setSimulationGrade"
  )
}

async function releaseTrainerControl(
  controlPoint: FtmsControlPointClient,
  capabilities: TrainerCapabilities
): Promise<void> {
  if (capabilities.has(Capability.Resistance)) {
    console.info("[trainer-io][ftms] release via resistance 0")
    await controlPoint.sendCommand({ type: "setResistance", level: 0 })
    return
  }

  if (capabilities.has(Capability.SimulationGrade)) {
    console.info("[trainer-io][ftms] release via simulation 0")
    await controlPoint.sendCommand({
      type: "setSimulationGrade",
      gradePercent: 0,
      windSpeedMps: 0,
    })
    return
  }

  console.info("[trainer-io][ftms] release via reset")
  await controlPoint.reset()
}
