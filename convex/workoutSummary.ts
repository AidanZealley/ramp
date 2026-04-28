type Interval = {
  startPower: number
  endPower: number
  durationSeconds: number
}

export type WorkoutSummarySnapshot = {
  totalDurationSeconds: number
  stressScore: number
}

export function computeWorkoutSummary(
  intervals: Interval[]
): WorkoutSummarySnapshot {
  const totalDurationSeconds = intervals.reduce(
    (sum, interval) => sum + interval.durationSeconds,
    0
  )

  if (totalDurationSeconds === 0) {
    return {
      totalDurationSeconds: 0,
      stressScore: 0,
    }
  }

  const rollingWindow: number[] = []
  let rollingSum = 0
  let rollingFourthPowerSum = 0
  let sampleCount = 0

  for (const interval of intervals) {
    const duration = Math.max(0, Math.round(interval.durationSeconds))
    if (duration === 0) continue

    for (let second = 0; second < duration; second += 1) {
      const progress = (second + 0.5) / duration
      const power =
        interval.startPower +
        (interval.endPower - interval.startPower) * progress

      rollingWindow.push(power)
      rollingSum += power

      if (rollingWindow.length > 30) {
        rollingSum -= rollingWindow.shift() ?? 0
      }

      const rollingAverage = rollingSum / rollingWindow.length
      rollingFourthPowerSum += rollingAverage ** 4
      sampleCount += 1
    }
  }

  const normalizedPower =
    sampleCount > 0 ? (rollingFourthPowerSum / sampleCount) ** 0.25 : 0
  const intensityFactor = normalizedPower / 100
  const stressScore =
    (totalDurationSeconds * normalizedPower * intensityFactor) / 3600

  return {
    totalDurationSeconds,
    stressScore,
  }
}
