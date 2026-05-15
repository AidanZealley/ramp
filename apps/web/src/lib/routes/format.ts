const METERS_PER_MILE = 1609.344
const FEET_PER_METER = 3.28084

export function formatRouteDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "0.0 mi"
  return `${(meters / METERS_PER_MILE).toFixed(1)} mi`
}

export function formatRouteElevation(meters: number | null): string {
  if (meters === null || !Number.isFinite(meters)) return "No elevation"
  return `${Math.round(meters * FEET_PER_METER).toLocaleString()} ft`
}

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE
}

export function metersToFeet(meters: number): number {
  return meters * FEET_PER_METER
}
