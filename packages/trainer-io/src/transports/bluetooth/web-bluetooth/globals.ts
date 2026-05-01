export {}

declare global {
  type BluetoothServiceUUID = string | number
  type BluetoothCharacteristicUUID = string | number

  type BluetoothLEScanFilter = {
    services?: Array<BluetoothServiceUUID>
    name?: string
    namePrefix?: string
  }

  type RequestDeviceOptions =
    | {
        filters: Array<BluetoothLEScanFilter>
        optionalServices?: Array<BluetoothServiceUUID>
        exclusionFilters?: Array<BluetoothLEScanFilter>
        acceptAllDevices?: false
      }
    | {
        acceptAllDevices: true
        optionalServices?: Array<BluetoothServiceUUID>
        exclusionFilters?: Array<BluetoothLEScanFilter>
        filters?: never
      }

  interface Bluetooth {
    requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>
  }

  interface Navigator {
    bluetooth?: Bluetooth
  }

  interface BluetoothDevice extends EventTarget {
    readonly id?: string
    readonly name?: string
    readonly gatt?: BluetoothRemoteGATTServer
  }

  interface BluetoothRemoteGATTServer {
    readonly connected: boolean
    connect(): Promise<BluetoothRemoteGATTServer>
    disconnect(): void
    getPrimaryService(
      service: BluetoothServiceUUID
    ): Promise<BluetoothRemoteGATTService>
  }

  interface BluetoothRemoteGATTService {
    getCharacteristic(
      characteristic: BluetoothCharacteristicUUID
    ): Promise<BluetoothRemoteGATTCharacteristic>
  }

  interface BluetoothRemoteGATTCharacteristic extends EventTarget {
    readonly uuid: string
    readonly value?: DataView | null
    readValue(): Promise<DataView>
    writeValue(value: BufferSource): Promise<void>
    writeValueWithResponse?(value: BufferSource): Promise<void>
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>
    stopNotifications?(): Promise<BluetoothRemoteGATTCharacteristic>
  }
}
