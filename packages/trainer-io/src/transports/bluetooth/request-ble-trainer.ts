import { requestBleDevice } from "./web-bluetooth/request-device"
import { FtmsBleTrainer } from "./ftms"
import type { TrainerSource } from "../../types"
import type { BleTrainerRequestOptions } from "./web-bluetooth/request-device"

export async function requestBleTrainer(
  options: BleTrainerRequestOptions = {}
): Promise<TrainerSource> {
  const device = await requestBleDevice(options)
  return new FtmsBleTrainer({
    device,
    requestTimeoutMs: options.requestTimeoutMs,
  })
}
