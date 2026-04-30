import { useEffect, useMemo, useRef, useState } from "react"
import { useRideSession, type RideSessionController } from "@ramp/ride-core"
import { HILL_CLIMB_STAGE, getStageDistanceMeters } from "./stage-data"
import { sampleStageAtDistance } from "./stage-sampling"
import type { HillClimbRunSummary } from "./types"

const GRADE_EPSILON = 0.25

export function HillClimbGameView({
  session,
}: {
  session: RideSessionController
}) {
  const state = useRideSession(session)
  const telemetry = state.telemetry
  const [completionSummary, setCompletionSummary] =
    useState<HillClimbRunSummary | null>(null)
  const lastElapsedRef = useRef(telemetry.elapsedSeconds)
  const averageAccumulatorRef = useRef({
    powerSeconds: 0,
    elapsedSeconds: 0,
  })
  const lastDispatchedGradeRef = useRef<number | null>(null)
  const lastDispatchedSegmentRef = useRef<number | null>(null)
  const totalDistanceMeters = getStageDistanceMeters(HILL_CLIMB_STAGE)

  useEffect(() => {
    const deltaSeconds = Math.max(
      0,
      telemetry.elapsedSeconds - lastElapsedRef.current
    )
    lastElapsedRef.current = telemetry.elapsedSeconds

    if (completionSummary || state.paused || deltaSeconds === 0) {
      return
    }

    averageAccumulatorRef.current.elapsedSeconds += deltaSeconds

    if (typeof telemetry.powerWatts === "number") {
      averageAccumulatorRef.current.powerSeconds +=
        telemetry.powerWatts * deltaSeconds
    }
  }, [
    completionSummary,
    state.paused,
    telemetry.elapsedSeconds,
    telemetry.powerWatts,
  ])

  const liveSample = sampleStageAtDistance(HILL_CLIMB_STAGE, telemetry.distanceMeters)
  const sample = completionSummary
    ? sampleStageAtDistance(HILL_CLIMB_STAGE, completionSummary.totalDistanceMeters)
    : liveSample
  const riderOffset = useMemo(() => {
    const cadence = telemetry.cadenceRpm ?? 0
    const power = telemetry.powerWatts ?? 0
    return Math.sin(telemetry.elapsedSeconds * 7) * Math.min(10, cadence / 18) +
      Math.min(8, power / 70)
  }, [telemetry.cadenceRpm, telemetry.elapsedSeconds, telemetry.powerWatts])

  useEffect(() => {
    if (completionSummary || liveSample.stageComplete) {
      return
    }

    const lastGrade = lastDispatchedGradeRef.current
    const lastSegment = lastDispatchedSegmentRef.current
    const gradeChanged =
      lastGrade === null ||
      Math.abs(liveSample.gradePercent - lastGrade) >= GRADE_EPSILON
    const segmentChanged = lastSegment !== liveSample.segmentIndex

    if (!gradeChanged && !segmentChanged) {
      return
    }

    lastDispatchedGradeRef.current = liveSample.gradePercent
    lastDispatchedSegmentRef.current = liveSample.segmentIndex

    void session.controls.dispatch(
      {
        type: "setSimulationGrade",
        gradePercent: liveSample.gradePercent,
      },
      "game"
    )
  }, [
    completionSummary,
    liveSample.gradePercent,
    liveSample.segmentIndex,
    liveSample.stageComplete,
    session,
  ])

  useEffect(() => {
    if (completionSummary || !liveSample.stageComplete) {
      return
    }

    const elapsedSeconds = telemetry.elapsedSeconds
    const averageSpeedMps =
      elapsedSeconds > 0 ? totalDistanceMeters / elapsedSeconds : 0
    const { elapsedSeconds: accumulatedSeconds, powerSeconds } =
      averageAccumulatorRef.current

    setCompletionSummary({
      elapsedSeconds,
      totalDistanceMeters,
      averageSpeedMps,
      averagePowerWatts:
        accumulatedSeconds > 0 ? powerSeconds / accumulatedSeconds : null,
      completed: true,
    })
  }, [
    completionSummary,
    liveSample.stageComplete,
    telemetry.elapsedSeconds,
    totalDistanceMeters,
  ])

  const profilePoints = useMemo(() => {
    const maxGrade = Math.max(
      ...HILL_CLIMB_STAGE.segments.map((segment) => segment.gradePercent),
      1
    )
    let traversedMeters = 0
    let elevationUnits = 0
    const points = [`0,82`]

    for (const segment of HILL_CLIMB_STAGE.segments) {
      traversedMeters += segment.lengthMeters
      elevationUnits += segment.lengthMeters * (segment.gradePercent / 100)
      const x = (traversedMeters / totalDistanceMeters) * 100
      const y = 82 - (elevationUnits / (totalDistanceMeters * (maxGrade / 100))) * 56
      points.push(`${x},${clamp(y, 12, 82)}`)
    }

    return points.join(" ")
  }, [totalDistanceMeters])

  const progressPercent = sample.normalizedProgress * 100
  const currentSpeedKph = (telemetry.speedMps ?? 0) * 3.6
  const distanceRemainingKm = sample.remainingMeters / 1000
  const replayHref =
    typeof window === "undefined"
      ? "#"
      : `${window.location.pathname}?run=${Date.now()}`

  return (
    <div className="relative h-full w-full overflow-hidden text-white">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,#7fd4ff_0%,#cbe9ff_36%,#ffe2a6_100%)]" />
      <div className="absolute inset-x-0 bottom-[28%] top-[12%] bg-[radial-gradient(circle_at_20%_25%,rgba(255,255,255,0.55),transparent_26%),radial-gradient(circle_at_80%_18%,rgba(255,255,255,0.34),transparent_24%)]" />
      <div className="absolute inset-x-0 bottom-[26%] h-[38%] bg-[linear-gradient(180deg,rgba(34,89,111,0.15),rgba(15,34,42,0.5))]" />
      <div className="absolute bottom-[30%] left-[-5%] h-[34%] w-[50%] rounded-[50%] bg-[#5a7891]/65 blur-[2px]" />
      <div className="absolute bottom-[28%] right-[-6%] h-[42%] w-[56%] rounded-[50%] bg-[#2f5568]/72 blur-[2px]" />
      <div className="absolute bottom-[24%] left-[12%] h-[28%] w-[76%] rounded-[50%] bg-[#173241]/78 blur-[1px]" />

      <div className="absolute inset-x-0 top-0 z-10 p-4 pt-24 sm:p-6 sm:pt-28">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl rounded-[1.75rem] border border-white/28 bg-[#102535]/45 p-5 shadow-2xl backdrop-blur-md">
            <p className="text-xs font-semibold tracking-[0.3em] text-[#d5f0ff] uppercase">
              Hill Climb Stage
            </p>
            <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">
              {HILL_CLIMB_STAGE.title}
            </h1>
            <p className="mt-3 text-sm leading-6 text-white/82">
              {HILL_CLIMB_STAGE.description}
            </p>
          </div>

          <div className="grid gap-3 rounded-[1.75rem] border border-white/28 bg-[#102535]/45 p-4 text-sm shadow-2xl backdrop-blur-md sm:grid-cols-3">
            <Stat label="Current grade" value={`${sample.gradePercent.toFixed(1)}%`} />
            <Stat label="Remaining" value={`${distanceRemainingKm.toFixed(2)} km`} />
            <Stat label="Speed" value={`${currentSpeedKph.toFixed(1)} km/h`} />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0 top-[22%]">
        <div
          className="absolute inset-x-0 bottom-[18%] h-[22%] origin-left bg-[linear-gradient(180deg,#9f6927,#6a431d)] shadow-[0_-18px_40px_rgba(58,30,10,0.24)]"
          style={{
            clipPath:
              "polygon(0% 72%,12% 64%,25% 58%,44% 48%,58% 50%,72% 40%,84% 28%,100% 22%,100% 100%,0% 100%)",
          }}
        />

        <div
          className="absolute bottom-[28%] left-[12%] z-10 transition-transform duration-150"
          style={{
            transform: `translateX(${clamp(progressPercent, 0, 100) * 0.68}vw) translateY(${-riderOffset}px)`,
          }}
        >
          <div className="flex items-end gap-2">
            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#1d1f24] bg-[#f86f3e] shadow-xl">
              <div className="absolute -bottom-3 left-1/2 h-2.5 w-14 -translate-x-1/2 rounded-full bg-[#14181d]" />
              <div className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#14181d]" />
              <div className="absolute left-2 top-8 h-1.5 w-12 rounded-full bg-[#14181d]" />
            </div>
            <div className="rounded-2xl border border-white/24 bg-[#102535]/75 px-3 py-2 text-xs font-semibold tracking-[0.18em] uppercase">
              {sample.currentSegment.label ?? "Climb"}
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-[6%] px-4 sm:px-6">
          <div className="mx-auto max-w-6xl rounded-[2rem] border border-white/22 bg-[#081723]/58 p-5 shadow-2xl backdrop-blur-md">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-2">
                <p className="text-xs font-semibold tracking-[0.28em] text-[#b8ddf0] uppercase">
                  Stage progress
                </p>
                <div className="flex items-end gap-3">
                  <span className="font-heading text-4xl font-semibold tracking-tight">
                    {progressPercent.toFixed(0)}%
                  </span>
                  <span className="pb-1 text-sm text-white/72">
                    {(sample.distanceMeters / 1000).toFixed(2)} /{" "}
                    {(totalDistanceMeters / 1000).toFixed(2)} km
                  </span>
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="h-28 w-full overflow-visible"
                  aria-hidden="true"
                >
                  <polyline
                    fill="none"
                    stroke="rgba(255,255,255,0.34)"
                    strokeWidth="10"
                    points={profilePoints}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polyline
                    fill="none"
                    stroke="#ffd36d"
                    strokeWidth="5"
                    points={profilePoints}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <line
                    x1={progressPercent}
                    x2={progressPercent}
                    y1="10"
                    y2="88"
                    stroke="rgba(255,255,255,0.35)"
                    strokeDasharray="4 4"
                  />
                  <circle
                    cx={progressPercent}
                    cy="30"
                    r="4.5"
                    fill="#ff7448"
                    stroke="#fff4db"
                    strokeWidth="2"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {completionSummary ? (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-[#08131d]/58 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/20 bg-[#102535]/88 p-8 text-white shadow-2xl">
            <p className="text-xs font-semibold tracking-[0.32em] text-[#bce7ff] uppercase">
              Summit reached
            </p>
            <h2 className="mt-3 font-heading text-4xl font-semibold tracking-tight">
              Stage complete
            </h2>
            <p className="mt-3 text-sm leading-6 text-white/78">
              You topped out on {HILL_CLIMB_STAGE.title}. The trainer grade is now
              frozen and this run summary is derived from the current session only.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <SummaryStat
                label="Elapsed"
                value={formatElapsed(completionSummary.elapsedSeconds)}
              />
              <SummaryStat
                label="Distance"
                value={`${(completionSummary.totalDistanceMeters / 1000).toFixed(2)} km`}
              />
              <SummaryStat
                label="Avg speed"
                value={`${(completionSummary.averageSpeedMps * 3.6).toFixed(1)} km/h`}
              />
              <SummaryStat
                label="Avg power"
                value={
                  completionSummary.averagePowerWatts === null
                    ? "N/A"
                    : `${Math.round(completionSummary.averagePowerWatts)} W`
                }
              />
            </div>

            <div className="mt-4 rounded-2xl border border-white/12 bg-white/6 px-4 py-3 text-sm text-white/78">
              Completion status: {completionSummary.completed ? "Summit reached" : "Incomplete"}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={replayHref}
                className="inline-flex rounded-full bg-[#ffd36d] px-5 py-2.5 font-heading text-sm font-semibold tracking-[0.14em] text-[#18120a] uppercase"
              >
                Ride again
              </a>
              <a
                href="/ride"
                className="inline-flex rounded-full border border-white/24 bg-white/8 px-5 py-2.5 font-heading text-sm font-semibold tracking-[0.14em] text-white uppercase"
              >
                Back to games
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/8 px-3 py-2">
      <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-[#b7ddef] uppercase">
        {label}
      </p>
      <p className="mt-1 font-heading text-xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/14 bg-white/6 p-4">
      <p className="text-[0.65rem] font-semibold tracking-[0.22em] text-[#b7ddef] uppercase">
        {label}
      </p>
      <p className="mt-2 font-heading text-2xl font-semibold tracking-tight">
        {value}
      </p>
    </div>
  )
}

function formatElapsed(elapsedSeconds: number) {
  const wholeSeconds = Math.max(0, Math.round(elapsedSeconds))
  const minutes = Math.floor(wholeSeconds / 60)
  const seconds = wholeSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}
