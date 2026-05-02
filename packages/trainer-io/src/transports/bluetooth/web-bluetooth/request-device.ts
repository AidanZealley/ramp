import { createControllableTrainerRequestOptions } from "./uuids"
import type { TrainerError } from "../../../types"

export type BleTrainerRequestOptions = {
  requestDevice?: (options: RequestDeviceOptions) => Promise<BluetoothDevice>
  requestTimeoutMs?: number
}

export function isWebBluetoothAvailable(): boolean {
  const bluetooth =
    typeof navigator !== "undefined" ? navigator.bluetooth : undefined
  return (
    typeof navigator !== "undefined" &&
    typeof bluetooth?.requestDevice === "function"
  )
}

export async function requestBleDevice(
  options: BleTrainerRequestOptions = {}
): Promise<BluetoothDevice> {
  if (!isWebBluetoothAvailable()) {
    throw createTrainerError(
      "unsupported",
      "Web Bluetooth is unavailable in this browser."
    )
  }

  const bluetooth = navigator.bluetooth
  if (!bluetooth) {
    throw createTrainerError(
      "unsupported",
      "Web Bluetooth is unavailable in this browser."
    )
  }

  const requestDevice =
    options.requestDevice?.bind(undefined) ??
    bluetooth.requestDevice.bind(bluetooth)

  try {
    console.info("[trainer-io][ble] opening device chooser")
    return await requestDevice(createControllableTrainerRequestOptions())
  } catch (error: unknown) {
    console.error("[trainer-io][ble] requestDevice failed", error)
    throw mapWebBluetoothError(error, "permission")
  }
}

export function mapWebBluetoothError(
  error: unknown,
  fallbackCode: TrainerError["code"] = "transport"
): TrainerError {
  if (isTrainerError(error)) return error

  const name = getErrorName(error)
  if (
    name === "NotAllowedError" ||
    name === "SecurityError" ||
    name === "NotFoundError"
  ) {
    return createTrainerError(
      "permission",
      "Bluetooth permission was denied or the device chooser was cancelled.",
      error
    )
  }

  if (name === "NotSupportedError") {
    return createTrainerError(
      "unsupported",
      "Web Bluetooth is unsupported on this browser or platform.",
      error
    )
  }

  if (fallbackCode === "timeout") {
    return createTrainerError(
      "timeout",
      "Bluetooth operation timed out.",
      error
    )
  }

  if (fallbackCode === "unsupported") {
    return createTrainerError(
      "unsupported",
      "Web Bluetooth is unsupported on this browser or platform.",
      error
    )
  }

  return createTrainerError(
    fallbackCode,
    "Bluetooth transport operation failed.",
    error
  )
}

function createTrainerError(
  code: TrainerError["code"],
  message: string,
  cause?: unknown
): TrainerError {
  return { code, message, cause }
}

function getErrorName(error: unknown): string | null {
  if (error instanceof Error) return error.name
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof (error).name === "string"
  ) {
    return (error as { name: string }).name
  }
  return null
}

function isTrainerError(value: unknown): value is TrainerError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value &&
    typeof (value as { code: unknown }).code === "string" &&
    typeof (value as { message: unknown }).message === "string"
  )
}
