export const FALLBACK_SPEED_MPS = 25 / 3.6
export const GRADE_DISPATCH_INTERVAL_MS = 500
export const GRADE_DISPATCH_DELTA_PERCENT = 0.25
export const SEEK_TRANSITION_DURATION_MS = 2000
export const SEEK_GRADE_DISPATCH_INTERVAL_MS = 200

export type SeekTransitionGradeInput = {
  startedAtMs: number
  durationMs: number
  fromGradePercent: number
  toGradePercent: number
  nowMs: number
}

export function formatMetricDistance(meters: number): string {
  return `${Math.max(0, meters / 1000).toFixed(1)} km`
}

export function formatElapsedTime(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`
}

export function smoothingLevelToMeters(level: number): number {
  return Math.max(0, Math.min(10, Math.round(level))) * 50
}

export function smoothstep(value: number): number {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

export function interpolateNumber(from: number, to: number, t: number): number {
  return from + (to - from) * Math.max(0, Math.min(1, t))
}

export function getPreservedSeekSpeedMps(speedMps: number): number {
  return Number.isFinite(speedMps) && speedMps >= 0 ? speedMps : 0
}

export function getSeekTransitionGrade({
  startedAtMs,
  durationMs,
  fromGradePercent,
  toGradePercent,
  nowMs,
}: SeekTransitionGradeInput): { gradePercent: number; progress: number } {
  const progress =
    durationMs > 0 ? Math.max(0, Math.min(1, (nowMs - startedAtMs) / durationMs)) : 1

  return {
    gradePercent: interpolateNumber(
      fromGradePercent,
      toGradePercent,
      smoothstep(progress)
    ),
    progress,
  }
}
