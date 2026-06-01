import { useMemo, useRef, useState } from "react"
import { Check, Pause, Play, SkipBack, SkipForward, Square } from "lucide-react"
import type { PointerEvent } from "react"
import type { Interval } from "@/lib/workout-utils"
import { WorkoutMini } from "@/components/workout-mini"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

type WorkoutProgressOverviewProps = {
  intervals: Array<Interval>
  ftp: number
  elapsedSeconds: number
  totalDurationSeconds: number
  activeSegmentIndex: number | null
  completedIntervalCount: number
  difficultyPercent?: number
  paused: boolean
  isComplete: boolean
  onPause?: () => void
  onResume?: () => void
  onStop: () => void
  onSeek?: (elapsedSeconds: number) => void | Promise<void>
  disableSeek?: boolean
  stopDialogOpen?: boolean
  onStopDialogOpenChange?: (open: boolean) => void
}

export const WorkoutProgressOverview = ({
  intervals,
  ftp,
  elapsedSeconds,
  totalDurationSeconds,
  activeSegmentIndex,
  completedIntervalCount,
  difficultyPercent = 100,
  paused,
  isComplete,
  onPause,
  onResume,
  onStop,
  onSeek,
  disableSeek = false,
  stopDialogOpen,
  onStopDialogOpenChange,
}: WorkoutProgressOverviewProps) => {
  const seekEnabled = !disableSeek && onSeek !== undefined
  const timelineRef = useRef<HTMLDivElement | null>(null)
  const [previewElapsedSeconds, setPreviewElapsedSeconds] = useState<
    number | null
  >(null)
  const displayElapsedSeconds = previewElapsedSeconds ?? elapsedSeconds
  const clampedElapsedSeconds = clamp(
    displayElapsedSeconds,
    0,
    totalDurationSeconds
  )
  const progress =
    totalDurationSeconds > 0
      ? (clampedElapsedSeconds / totalDurationSeconds) * 100
      : 0
  const intervalStarts = useMemo(() => {
    const starts: Array<number> = []
    let cursor = 0
    for (const interval of intervals) {
      starts.push(cursor)
      cursor += Math.max(0, interval.durationSeconds)
    }
    return starts
  }, [intervals])
  const displayIntervalIndex =
    previewElapsedSeconds === null
      ? activeSegmentIndex
      : getIntervalIndexAtElapsed(intervals, clampedElapsedSeconds)
  const displayCompletedIntervalCount =
    previewElapsedSeconds === null
      ? completedIntervalCount
      : getCompletedIntervalCount(intervals, clampedElapsedSeconds)
  const reducedIntervalIndexes = useMemo(
    () =>
      Array.from(
        { length: displayCompletedIntervalCount },
        (_, index) => index
      ),
    [displayCompletedIntervalCount]
  )
  const maxPower = Math.max(
    ...intervals.flatMap((interval) => [
      interval.startPower,
      interval.endPower,
    ]),
    1
  )
  const ftpPower = 100
  const ftpLineTopPercent = 100 - (ftpPower / (maxPower * 1.15)) * 100
  const showFtpLine = ftpLineTopPercent >= 0 && ftpLineTopPercent <= 100

  const getElapsedFromPointer = (clientX: number) => {
    const rect = timelineRef.current?.getBoundingClientRect()
    if (!rect || rect.width <= 0 || totalDurationSeconds <= 0) return 0
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1)
    return ratio * totalDurationSeconds
  }

  const commitSeek = (nextElapsedSeconds: number) => {
    if (!seekEnabled) return
    void onSeek(clamp(nextElapsedSeconds, 0, totalDurationSeconds))
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!seekEnabled) return
    if (!timelineRef.current?.hasPointerCapture(event.pointerId)) return
    setPreviewElapsedSeconds(getElapsedFromPointer(event.clientX))
  }

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!seekEnabled) return
    if (!timelineRef.current?.hasPointerCapture(event.pointerId)) return
    const nextElapsedSeconds = getElapsedFromPointer(event.clientX)
    timelineRef.current.releasePointerCapture(event.pointerId)
    setPreviewElapsedSeconds(null)
    commitSeek(nextElapsedSeconds)
  }

  const handleSkipBack = () => {
    const currentIndex = activeSegmentIndex ?? 0
    const currentStart = intervalStarts[currentIndex] ?? 0
    const previousStart = intervalStarts[Math.max(0, currentIndex - 1)] ?? 0
    const nextElapsedSeconds =
      clampedElapsedSeconds - currentStart <= 3 ? previousStart : currentStart
    commitSeek(nextElapsedSeconds)
  }

  const handleSkipForward = () => {
    const currentIndex = activeSegmentIndex ?? 0
    const nextStart = intervalStarts[currentIndex + 1] ?? totalDurationSeconds
    commitSeek(nextStart)
  }

  return (
    <section className="min-w-0" aria-label="Workout overview">
      <div className="mb-2 flex items-center justify-between gap-3 text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        <span>Workout overview</span>
        <span>
          {completedIntervalCount}/{intervals.length} intervals completed
        </span>
      </div>
      <div
        ref={timelineRef}
        className={
          seekEnabled
            ? "group/timeline relative h-28 cursor-col-resize touch-none overflow-hidden md:h-36 xl:h-44"
            : "group/timeline relative h-28 touch-none overflow-hidden md:h-36 xl:h-44"
        }
        data-testid="workout-progress-timeline"
        onPointerDown={
          seekEnabled
            ? (event) => {
                timelineRef.current?.setPointerCapture(event.pointerId)
                setPreviewElapsedSeconds(getElapsedFromPointer(event.clientX))
              }
            : undefined
        }
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <WorkoutMini
          intervals={intervals}
          className="h-full"
          powerScalePercent={difficultyPercent}
          aria-label="Workout interval shape"
          showFtpLine
          highlightedIntervalIndex={displayIntervalIndex}
          reducedIntervalIndexes={reducedIntervalIndexes}
        />
        {showFtpLine && (
          <Badge
            variant="outline"
            className="pointer-events-none absolute right-2 z-30 bg-background/85"
            style={{ top: `calc(${ftpLineTopPercent}% - 24px)` }}
          >
            {`FTP ${ftp}W`}
          </Badge>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 bg-[color-mix(in_oklch,var(--primary)_18%,transparent)]"
          style={{ width: `${progress}%` }}
        />
        <div
          aria-hidden="true"
          data-testid="workout-progress-line"
          className="absolute inset-y-0 z-20 w-px bg-primary transition-colors group-hover/timeline:bg-white md:w-0.5"
          style={{ left: `${progress}%` }}
        />
        {paused && !isComplete && (
          <div className="absolute inset-0 right-0 z-10 grid place-items-center bg-background/50">
            <div className="flex flex-col items-center gap-1 rounded-2xl border bg-background/50 p-3">
              <Pause className="size-5 text-muted-foreground" />
              <span className="text-sm">
                {elapsedSeconds > 0 ? "Workout paused" : "Workout not started"}
              </span>
            </div>
          </div>
        )}
        {isComplete && (
          <div className="absolute inset-0 grid place-items-center bg-background/75">
            <div className="flex flex-col items-center gap-1 rounded-2xl border bg-background/50 p-3">
              <Check className="size-5 text-muted-foreground" />
              <span className="text-sm">Workout complete</span>
            </div>
          </div>
        )}
      </div>
      <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div aria-hidden="true" />
        <div className="flex items-center justify-center gap-2 justify-self-center">
          {seekEnabled && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleSkipBack}
              disabled={isComplete || intervals.length === 0}
              aria-label="Skip to previous interval"
            >
              <SkipBack />
            </Button>
          )}
          <Button
            type="button"
            variant="default"
            onClick={paused ? onResume : onPause}
            size="icon-lg"
            className="size-12 shadow-sm [&_svg:not([class*='size-'])]:size-5"
            disabled={isComplete}
            aria-label={paused ? "Start workout" : "Pause workout"}
          >
            {paused ? <Play /> : <Pause />}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="icon-lg"
            className="size-12 shadow-sm [&_svg:not([class*='size-'])]:size-5"
            aria-label="End workout"
            aria-pressed={stopDialogOpen}
            onClick={() => {
              onStopDialogOpenChange?.(true)
              onStop()
            }}
          >
            <Square />
          </Button>
          {seekEnabled && (
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={handleSkipForward}
              disabled={isComplete || intervals.length === 0}
              aria-label="Skip to next interval"
            >
              <SkipForward />
            </Button>
          )}
        </div>
        <div aria-hidden="true" />
      </div>
    </section>
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getIntervalIndexAtElapsed(
  intervals: ReadonlyArray<Interval>,
  elapsedSeconds: number
): number | null {
  let cursor = 0
  for (let index = 0; index < intervals.length; index += 1) {
    const duration = Math.max(0, intervals[index].durationSeconds)
    const endSeconds = cursor + duration
    const isLast = index === intervals.length - 1
    if (
      elapsedSeconds < endSeconds ||
      (isLast && elapsedSeconds === endSeconds)
    ) {
      return index
    }
    cursor = endSeconds
  }
  return null
}

function getCompletedIntervalCount(
  intervals: ReadonlyArray<Interval>,
  elapsedSeconds: number
): number {
  let cursor = 0
  let completed = 0
  for (const interval of intervals) {
    cursor += Math.max(0, interval.durationSeconds)
    if (elapsedSeconds >= cursor) completed += 1
  }
  return completed
}
