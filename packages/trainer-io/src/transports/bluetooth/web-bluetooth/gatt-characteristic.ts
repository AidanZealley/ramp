import { mapWebBluetoothError } from "./request-device"

export class GattCharacteristic {
  constructor(
    private readonly characteristic: BluetoothRemoteGATTCharacteristic
  ) {}

  get uuid(): string {
    return this.characteristic.uuid
  }

  async readValue(): Promise<DataView> {
    try {
      return await this.characteristic.readValue()
    } catch (error: unknown) {
      throw mapWebBluetoothError(error, "transport")
    }
  }

  async writeValue(value: BufferSource): Promise<void> {
    try {
      const writeValueWithResponse = this.characteristic.writeValueWithResponse
      if (typeof writeValueWithResponse === "function") {
        await writeValueWithResponse.call(this.characteristic, value)
        return
      }
      await this.characteristic.writeValue(value)
    } catch (error: unknown) {
      throw mapWebBluetoothError(error, "transport")
    }
  }

  async startNotifications(): Promise<void> {
    try {
      await this.characteristic.startNotifications()
    } catch (error: unknown) {
      throw mapWebBluetoothError(error, "transport")
    }
  }

  async stopNotifications(): Promise<void> {
    try {
      const stopNotifications = this.characteristic.stopNotifications
      if (typeof stopNotifications === "function") {
        await stopNotifications.call(this.characteristic)
      }
    } catch {
      // Best-effort cleanup only.
    }
  }

  subscribe(listener: (value: DataView) => void): () => void {
    const handler = (event: Event) => {
      const target = event.target as BluetoothRemoteGATTCharacteristic | null
      if (!target?.value) return
      listener(target.value)
    }

    this.characteristic.addEventListener("characteristicvaluechanged", handler)
    return () => {
      this.characteristic.removeEventListener(
        "characteristicvaluechanged",
        handler
      )
    }
  }
}
