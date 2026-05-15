export const FALLBACK_SPEED_MPS = 25 / 3.6
export const GRADE_DISPATCH_INTERVAL_MS = 500
export const GRADE_DISPATCH_DELTA_PERCENT = 0.25

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
