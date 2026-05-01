export type FtmsIndoorBikeData = {
  powerWatts: number | null
  cadenceRpm: number | null
  speedMps: number | null
  heartRateBpm: number | null
}

export type FtmsFeatureSupport = {
  readings: {
    speed: boolean
    cadence: boolean
    power: boolean
    heartRate: boolean
  }
  targets: {
    resistance: boolean
    power: boolean
    simulation: boolean
    spinDown: boolean
  }
}

export type FtmsSupportedRange = {
  min: number
  max: number
  increment: number
}

export type FtmsControlPointResponse = {
  requestCode: number
  resultCode: number
  ok: boolean
}
