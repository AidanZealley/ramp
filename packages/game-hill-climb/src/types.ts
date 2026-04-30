export type HillClimbSegment = {
  lengthMeters: number
  gradePercent: number
  label?: string
}

export type HillClimbStage = {
  id: string
  title: string
  description: string
  segments: Array<HillClimbSegment>
}

export type HillClimbStageSample = {
  currentSegment: HillClimbSegment
  segmentIndex: number
  distanceMeters: number
  remainingMeters: number
  normalizedProgress: number
  gradePercent: number
  stageComplete: boolean
  totalDistanceMeters: number
}

export type HillClimbRunSummary = {
  elapsedSeconds: number
  totalDistanceMeters: number
  averageSpeedMps: number
  averagePowerWatts: number | null
  completed: boolean
}
