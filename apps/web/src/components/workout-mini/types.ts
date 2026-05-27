import type { Interval } from "@/lib/workout-utils"

export type WorkoutMiniProps = {
  intervals: Array<Interval>
  className?: string
  compact?: boolean
  powerScalePercent?: number
  "aria-label"?: string
  showDividers?: boolean
  showFtpLine?: boolean
  highlightedIntervalIndex?: number | null
  reducedIntervalIndexes?: ReadonlyArray<number>
}

export type SegmentShape = {
  index: number
  points: string
  fill: string
  opacity: number
  scaledStartPower: number
  scaledEndPower: number
}
