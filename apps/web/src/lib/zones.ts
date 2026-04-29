export type Zone = 1 | 2 | 3 | 4 | 5 | 6

export interface ZoneInfo {
  zone: Zone
  name: string
  color: string
  colorMuted: string
}

const ZONE_MAP: Record<Zone, Omit<ZoneInfo, "zone">> = {
  1: {
    name: "Recovery",
    color: "oklch(0.65 0.01 260)",
    colorMuted: "oklch(0.65 0.01 260 / 0.55)",
  },
  2: {
    name: "Endurance",
    color: "oklch(0.65 0.18 250)",
    colorMuted: "oklch(0.65 0.18 250 / 0.55)",
  },
  3: {
    name: "Tempo",
    color: "oklch(0.72 0.18 145)",
    colorMuted: "oklch(0.72 0.18 145 / 0.55)",
  },
  4: {
    name: "Threshold",
    color: "oklch(0.84 0.17 95)",
    colorMuted: "oklch(0.84 0.17 95 / 0.55)",
  },
  5: {
    name: "VO2 Max",
    color: "oklch(0.73 0.19 55)",
    colorMuted: "oklch(0.73 0.19 55 / 0.55)",
  },
  6: {
    name: "Anaerobic",
    color: "oklch(0.63 0.22 25)",
    colorMuted: "oklch(0.63 0.22 25 / 0.55)",
  },
}

/**
 * Get the power zone based on power as a percentage of FTP.
 */
export function getZone(ftpPercentage: number): Zone {
  if (ftpPercentage < 60) return 1
  if (ftpPercentage <= 75) return 2
  if (ftpPercentage <= 89) return 3
  if (ftpPercentage <= 104) return 4
  if (ftpPercentage <= 118) return 5
  return 6
}

/**
 * Get zone info for a given power value as a percentage of FTP.
 */
export function getZoneInfo(power: number): ZoneInfo {
  const zone = getZone(power)
  return { zone, ...ZONE_MAP[zone] }
}

/**
 * Get the zone color for a given power value.
 */
export function getZoneColor(power: number): string {
  return getZoneInfo(power).color
}

/**
 * Get the muted zone color for a given power value.
 */
export function getZoneMutedColor(power: number): string {
  return getZoneInfo(power).colorMuted
}

export function getZoneInfoByZone(zone: Zone): ZoneInfo {
  return { zone, ...ZONE_MAP[zone] }
}
