import type { TrainerCommand, TrainerError } from "../../../types"
import type { GattCharacteristic } from "../web-bluetooth/gatt-characteristic"
import type { FtmsControlPointResponse } from "./types"

const RESPONSE_OPCODE = 0x80
const REQUEST_CONTROL_OPCODE = 0x00
const RESET_OPCODE = 0x01
const SET_RESISTANCE_OPCODE = 0x04
const SET_TARGET_POWER_OPCODE = 0x05
const SET_SIMULATION_OPCODE = 0x11

const RESULT_SUCCESS = 0x01

export function encodeRequestControl(): Uint8Array {
  return Uint8Array.of(REQUEST_CONTROL_OPCODE)
}

export function encodeReset(): Uint8Array {
  return Uint8Array.of(RESET_OPCODE)
}

export function encodeSetTargetPower(watts: number): Uint8Array {
  // Defensive clamp: this is hardware protocol encoding — ensure the value fits
  // in a uint16 even if upstream validation is relaxed in the future.
  const clamped = Math.max(0, Math.min(0xffff, Math.round(watts)))
  const bytes = new Uint8Array(3)
  const view = new DataView(bytes.buffer)
  view.setUint8(0, SET_TARGET_POWER_OPCODE)
  view.setUint16(1, clamped, true)
  return bytes
}

export function encodeSetResistance(level: number): Uint8Array {
  const bytes = new Uint8Array(3)
  const view = new DataView(bytes.buffer)
  view.setUint8(0, SET_RESISTANCE_OPCODE)
  view.setInt16(1, Math.round(level * 10), true)
  return bytes
}

export function encodeSetSimulationGrade(input: {
  gradePercent: number
  windSpeedMps?: number
  crr?: number
  windResistanceKgPerM?: number
}): Uint8Array {
  const bytes = new Uint8Array(7)
  const view = new DataView(bytes.buffer)
  view.setUint8(0, SET_SIMULATION_OPCODE)
  view.setInt16(1, Math.round((input.windSpeedMps ?? 0) * 1000), true)
  view.setInt16(3, Math.round(input.gradePercent * 100), true)
  view.setUint8(5, Math.round((input.crr ?? 0.004) * 10_000))
  view.setUint8(6, Math.round((input.windResistanceKgPerM ?? 0.51) * 100))
  return bytes
}

export function decodeControlPointResponse(
  view: DataView
): FtmsControlPointResponse {
  const opCode = view.getUint8(0)
  const requestCode = view.getUint8(1)
  const resultCode = view.getUint8(2)
  return {
    requestCode,
    resultCode,
    ok: opCode === RESPONSE_OPCODE && resultCode === RESULT_SUCCESS,
  }
}

export class FtmsControlPointClient {
  private pending: {
    opcode: number
    resolve: () => void
    reject: (error: TrainerError) => void
    timeout: ReturnType<typeof setTimeout>
  } | null = null
  private queue = Promise.resolve()
  private unsubscribe: (() => void) | null = null

  constructor(
    private readonly characteristic: GattCharacteristic,
    private readonly timeoutMs: number
  ) {}

  async start(): Promise<void> {
    await this.characteristic.startNotifications()
    this.unsubscribe = this.characteristic.subscribe((value) => {
      this.handleResponse(value)
    })
  }

  async stop(): Promise<void> {
    this.unsubscribe?.()
    this.unsubscribe = null
    this.rejectPending({
      code: "transport",
      message: "Trainer control point closed.",
    })
    await this.characteristic.stopNotifications()
  }

  async requestControl(): Promise<void> {
    console.info("[trainer-io][ftms] requesting control")
    await this.enqueue(REQUEST_CONTROL_OPCODE, encodeRequestControl())
  }

  async reset(): Promise<void> {
    console.info("[trainer-io][ftms] reset")
    await this.enqueue(RESET_OPCODE, encodeReset())
  }

  async sendCommand(command: TrainerCommand): Promise<void> {
    if (command.type === "setTargetPower") {
      console.info("[trainer-io][ftms] setTargetPower", {
        watts: command.watts,
      })
      await this.enqueue(
        SET_TARGET_POWER_OPCODE,
        encodeSetTargetPower(command.watts)
      )
      return
    }
    if (command.type === "setResistance") {
      console.info("[trainer-io][ftms] setResistance", {
        level: command.level,
      })
      await this.enqueue(
        SET_RESISTANCE_OPCODE,
        encodeSetResistance(command.level)
      )
      return
    }
    if (command.type === "setSimulationGrade") {
      console.info("[trainer-io][ftms] setSimulationGrade", {
        gradePercent: command.gradePercent,
        windSpeedMps: command.windSpeedMps,
      })
      await this.enqueue(
        SET_SIMULATION_OPCODE,
        encodeSetSimulationGrade({
          gradePercent: command.gradePercent,
          windSpeedMps: command.windSpeedMps,
        })
      )
      return
    }
  }

  private enqueue(opcode: number, payload: Uint8Array): Promise<void> {
    const work = this.queue.then(() => this.execute(opcode, payload))
    this.queue = work.catch(() => undefined)
    return work
  }

  private async execute(opcode: number, payload: Uint8Array): Promise<void> {
    await this.characteristic.writeValue(payload as unknown as BufferSource)

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (this.pending?.opcode !== opcode) return
        this.pending = null
        reject({
          code: "timeout",
          message: "Trainer control point response timed out.",
        } satisfies TrainerError)
      }, this.timeoutMs)

      this.pending = { opcode, resolve, reject, timeout }
    })
  }

  private handleResponse(value: DataView): void {
    const response = decodeControlPointResponse(value)
    console.info("[trainer-io][ftms] control response", response)
    if (!this.pending || response.requestCode !== this.pending.opcode) return

    const pending = this.pending
    this.pending = null
    clearTimeout(pending.timeout)
    if (response.ok) {
      pending.resolve()
      return
    }

    pending.reject({
      code: "command-rejected",
      message: `Trainer rejected FTMS opcode 0x${response.requestCode.toString(16)}.`,
      cause: response,
    })
  }

  private rejectPending(error: TrainerError): void {
    if (!this.pending) return
    const pending = this.pending
    this.pending = null
    clearTimeout(pending.timeout)
    pending.reject(error)
  }
}
