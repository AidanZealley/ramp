import type { Interval } from "@/lib/workout-utils"
import type { SegmentShape } from "./types"
import { getZoneColor } from "@/lib/zones"

export const VIEW_BOX_HEIGHT = 100
export const VIEW_BOX_WIDTH = 200

const FTP_POWER_PERCENT = 100
const CHART_HEADROOM_MULTIPLIER = 1.15
const MAX_TOTAL_GAP_WIDTH_RATIO = 0.25

export function getPowerScale(powerScalePercent: number): number {
  return Number.isFinite(powerScalePercent)
    ? Math.max(0, powerScalePercent) / 100
    : 1
}

export function getChartMaxPower(
  intervals: Array<Interval>,
  powerScale: number
): number {
  const workoutMaxPower = Math.max(
    ...intervals.flatMap((interval) => [
      interval.startPower,
      interval.endPower,
    ]),
    1
  )
  const effectiveMaxPower = workoutMaxPower * powerScale

  return Math.max(
    workoutMaxPower,
    effectiveMaxPower / CHART_HEADROOM_MULTIPLIER,
    1
  )
}

export function getTotalDuration(intervals: Array<Interval>): number {
  return intervals.reduce((sum, interval) => sum + interval.durationSeconds, 0)
}

export function getFtpY(maxPower: number): number {
  return getPowerY(FTP_POWER_PERCENT, maxPower)
}

export function buildSegmentShapes({
  intervals,
  maxPower,
  powerScale,
  totalDuration,
  svgGradientIdPrefix,
  highlightedIntervalIndex,
  reducedIndexes,
  gapWidth = 0,
}: {
  intervals: Array<Interval>
  maxPower: number
  powerScale: number
  totalDuration: number
  svgGradientIdPrefix: string
  highlightedIntervalIndex: number | null
  reducedIndexes: Set<number>
  gapWidth?: number
}): Array<SegmentShape> {
  let currentX = 0
  const gapCount = intervals.length > 1 ? intervals.length - 1 : 0
  const requestedTotalGapWidth = Math.max(0, gapWidth) * gapCount
  const maxTotalGapWidth = VIEW_BOX_WIDTH * MAX_TOTAL_GAP_WIDTH_RATIO
  const totalGapWidth = Math.min(requestedTotalGapWidth, maxTotalGapWidth)
  const resolvedGapWidth = gapCount > 0 ? totalGapWidth / gapCount : 0
  const drawableWidth = Math.max(0, VIEW_BOX_WIDTH - totalGapWidth)

  return intervals.map((interval, index) => {
    const x = currentX
    const width = (interval.durationSeconds / totalDuration) * drawableWidth
    const scaledStartPower = interval.startPower * powerScale
    const scaledEndPower = interval.endPower * powerScale

    currentX += width + resolvedGapWidth

    const fill =
      scaledStartPower === scaledEndPower
        ? getZoneColor(scaledStartPower)
        : `url(#${svgGradientIdPrefix}-segment-${index})`

    return {
      index,
      fill,
      scaledStartPower,
      scaledEndPower,
      opacity: getIntervalOpacity({
        index,
        highlightedIntervalIndex,
        reducedIndexes,
      }),
      points: getSegmentPoints({
        x,
        width,
        startY: getPowerY(scaledStartPower, maxPower),
        endY: getPowerY(scaledEndPower, maxPower),
      }),
    }
  })
}

function getPowerY(power: number, maxPower: number): number {
  const y =
    VIEW_BOX_HEIGHT -
    (power / (maxPower * CHART_HEADROOM_MULTIPLIER)) * VIEW_BOX_HEIGHT

  return Math.max(0, Math.min(VIEW_BOX_HEIGHT, y))
}

function getIntervalOpacity({
  index,
  highlightedIntervalIndex,
  reducedIndexes,
}: {
  index: number
  highlightedIntervalIndex: number | null
  reducedIndexes: Set<number>
}): number {
  if (highlightedIntervalIndex === index) return 1
  if (reducedIndexes.has(index)) return 0.35
  if (highlightedIntervalIndex !== null) return 0.9
  return 1
}

function getSegmentPoints({
  x,
  width,
  startY,
  endY,
}: {
  x: number
  width: number
  startY: number
  endY: number
}): string {
  return `${x},${startY} ${x + width},${endY} ${x + width},${VIEW_BOX_HEIGHT} ${x},${VIEW_BOX_HEIGHT}`
}
