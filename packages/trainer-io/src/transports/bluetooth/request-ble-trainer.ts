import type { TrainerSource } from "../../types"
import { requestBleDevice } from "./web-bluetooth/request-device"
import type { BleTrainerRequestOptions } from "./web-bluetooth/request-device"
import { FtmsBleTrainer } from "./ftms"

export async function requestBleTrainer(
  options: BleTrainerRequestOptions = {}
): Promise<TrainerSource> {
  const device = await requestBleDevice(options)
  return new FtmsBleTrainer({
    device,
    requestTimeoutMs: options.requestTimeoutMs,
  })
}
