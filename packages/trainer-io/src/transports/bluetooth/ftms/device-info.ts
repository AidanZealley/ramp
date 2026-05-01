import {
  DEVICE_INFORMATION_SERVICE_UUID,
  FIRMWARE_REVISION_STRING_CHARACTERISTIC_UUID,
  MANUFACTURER_NAME_STRING_CHARACTERISTIC_UUID,
  MODEL_NUMBER_STRING_CHARACTERISTIC_UUID,
} from "../web-bluetooth/uuids"
import { mapWebBluetoothError } from "../web-bluetooth/request-device"

export type BleTrainerDeviceInfo = {
  id: string | null
  name: string | null
  manufacturer: string | null
  modelNumber: string | null
  firmwareRevision: string | null
  isKickr: boolean
}

export function createInitialBleTrainerDeviceInfo(
  device: BluetoothDevice
): BleTrainerDeviceInfo {
  return {
    id: device.id ?? null,
    name: device.name ?? null,
    manufacturer: null,
    modelNumber: null,
    firmwareRevision: null,
    isKickr: isKickrName(device.name),
  }
}

export async function readBleTrainerDeviceInfo(
  device: BluetoothDevice
): Promise<BleTrainerDeviceInfo> {
  const base = createInitialBleTrainerDeviceInfo(device)
  const server = device.gatt
  if (!server?.connected) return base

  try {
    const service = await server.getPrimaryService(
      DEVICE_INFORMATION_SERVICE_UUID
    )
    const [manufacturer, modelNumber, firmwareRevision] = await Promise.all([
      readOptionalString(service, MANUFACTURER_NAME_STRING_CHARACTERISTIC_UUID),
      readOptionalString(service, MODEL_NUMBER_STRING_CHARACTERISTIC_UUID),
      readOptionalString(service, FIRMWARE_REVISION_STRING_CHARACTERISTIC_UUID),
    ])

    return {
      ...base,
      manufacturer,
      modelNumber,
      firmwareRevision,
      isKickr: isKickrName(base.name, manufacturer, modelNumber),
    }
  } catch {
    return base
  }
}

async function readOptionalString(
  service: BluetoothRemoteGATTService,
  characteristicUuid: BluetoothCharacteristicUUID
): Promise<string | null> {
  try {
    const characteristic = await service.getCharacteristic(characteristicUuid)
    const value = await characteristic.readValue()
    return new TextDecoder().decode(value.buffer).replace(/\0/g, "").trim()
  } catch (error: unknown) {
    const mapped = mapWebBluetoothError(error, "transport")
    if (mapped.code === "transport") return null
    throw mapped
  }
}

function isKickrName(...values: Array<string | null | undefined>): boolean {
  return values.some((value) => /wahoo|kickr/i.test(value ?? ""))
}
