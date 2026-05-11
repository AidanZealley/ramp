export function formatDistance(meters: number): string {
  const safeMeters = Math.max(0, meters)

  if (safeMeters < 1000) {
    return `${Math.round(safeMeters)} m`
  }

  return `${(safeMeters / 1000).toFixed(2)} km`
}
