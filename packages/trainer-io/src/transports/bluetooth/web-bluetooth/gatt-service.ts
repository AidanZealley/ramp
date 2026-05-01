import { mapWebBluetoothError } from "./request-device"
import { GattCharacteristic } from "./gatt-characteristic"

export class GattService {
  constructor(private readonly service: BluetoothRemoteGATTService) {}

  async getCharacteristic(
    characteristicUuid: BluetoothCharacteristicUUID
  ): Promise<GattCharacteristic> {
    try {
      const characteristic =
        await this.service.getCharacteristic(characteristicUuid)
      return new GattCharacteristic(characteristic)
    } catch (error: unknown) {
      throw mapWebBluetoothError(error, "transport")
    }
  }
}
