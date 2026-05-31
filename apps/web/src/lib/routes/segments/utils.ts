export type ElevationProfileSample = {
  distanceMeters: number
  elevationMeters: number
}

export function downsampleByDistance(
  samples: Array<ElevationProfileSample>,
  limit: number
) {
  if (samples.length <= limit) return samples
  if (limit <= 0) return []
  if (limit === 1) return [samples[0]]

  return Array.from({ length: limit }, (_, index) => {
    const targetIndex = Math.round(
      (index * (samples.length - 1)) / (limit - 1)
    )
    return samples[targetIndex]
  })
}

export function smoothElevationByDistance(
  samples: Array<ElevationProfileSample>,
  windowMeters: number
) {
  const halfWindow = windowMeters / 2
  return samples.map((sample, index) => {
    let total = 0
    let count = 0

    for (let i = index; i >= 0; i -= 1) {
      if (sample.distanceMeters - samples[i].distanceMeters > halfWindow) break
      total += samples[i].elevationMeters
      count += 1
    }
    for (let i = index + 1; i < samples.length; i += 1) {
      if (samples[i].distanceMeters - sample.distanceMeters > halfWindow) break
      total += samples[i].elevationMeters
      count += 1
    }

    return {
      distanceMeters: sample.distanceMeters,
      elevationMeters: total / count,
    }
  })
}
