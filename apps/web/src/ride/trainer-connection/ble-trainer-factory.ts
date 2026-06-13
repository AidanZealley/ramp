import {
  FtmsBleTrainer,
  getGrantedBleDevices,
  isWebBluetoothAvailable,
  requestBleDevice,
} from "@ramp/trainer-io"

export { getGrantedBleDevices, isWebBluetoothAvailable, requestBleDevice }

export function createBleTrainer(device: BluetoothDevice): FtmsBleTrainer {
  return new FtmsBleTrainer({ device })
}
