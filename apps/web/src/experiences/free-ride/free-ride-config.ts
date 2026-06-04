/**
 * Tunable constants for the Free Ride experience. Keeping the palette, motion,
 * camera, fog and post-processing numbers in one place makes it easy to retune
 * the Redout-style look without hunting through the scene graph.
 */

export const FREE_RIDE_PALETTE = {
  /** Deep dusk sky, top to horizon. */
  skyTop: "#050816",
  skyHorizon: "#18224b",
  /** Matches fog to the horizon so distant geometry dissolves into the sky. */
  fog: "#0b1025",
  /** Track surface (kept dark so the neon edges read). */
  trackSurface: "#070809",
  trackPanel: "#111318",
  trackShoulder: "#0d0f12",
  trackWall: "#181b20",
  trackUnderglow: "#151820",
  /** Neon accents. */
  neonCyan: "#19f4ff",
  neonMagenta: "#b244ff",
  neonOrange: "#d76b2a",
  neonViolet: "#7a4bff",
  scenery: "#080b17",
  sceneryRim: "#233064",
  windowWarm: "#7ea0ff",
  windowCool: "#19f4ff",
} as const

export const FREE_RIDE_MOTION = {
  /** Cruise speed (m/s of *visual* travel) when no trainer speed is present. */
  cruiseSpeedMps: 42,
  /** Multiplier applied to real trainer speed so pedalling feels like flying. */
  visualSpeedScale: 3.2,
  /** Clamp so a sprint can't dump us into hyperspace. */
  maxSpeedMps: 110,
  /** Exponential easing rate (per second) toward the target speed. */
  speedEaseRate: 1.6,
} as const

export const FREE_RIDE_CAMERA = {
  /** Height of the eye above the track surface (first person, close to ground). */
  eyeHeightMeters: 1.15,
  /** How far down the track the camera looks. */
  lookAheadMeters: 26,
  /** Slight downward sightline keeps the elevated deck visible in first person. */
  lookDownMeters: 0.85,
  /** FOV at rest and the extra degrees added at max speed. */
  baseFov: 74,
  speedFovBoost: 16,
  /** Position/orientation smoothing (per second). Higher = snappier. */
  positionLerpRate: 6,
  orientationLerpRate: 7,
  /** Subtle vertical bob. */
  bobAmplitude: 0.06,
  bobFrequency: 2.2,
  /** Camera leans a little harder than the track banks. */
  bankMultiplier: 1.15,
  maxBankRad: 0.6,
} as const

export const FREE_RIDE_TRACK = {
  halfWidthMeters: 5.2,
  /** Streaming ribbon: number of cross-sections and spacing between them. */
  segmentCount: 240,
  segmentSpacingMeters: 2.4,
  /** Start the ribbon slightly behind the camera so there's no near-clip gap. */
  behindMeters: 18,
} as const

export const FREE_RIDE_TRACK_SURFACE = {
  centerHalfWidthMeters: 3.8,
  innerPanelHalfWidthMeters: 5.2,
  shoulderOuterMeters: 6.35,
  wallOuterMeters: 7.1,
  wallBaseLiftMeters: 0.28,
  shoulderDropMeters: 0.16,
  deckAlpha: 0.72,
  roughness: 0.22,
  metalness: 0.42,
} as const

export const FREE_RIDE_ELEVATION = {
  /** Visual-only road height exaggeration. Trainer grade remains physical. */
  visualHeightScale: 2.2,
  /** Lower-world drop measured from visually amplified road height. */
  lowerCityDropMeters: 90,
  /** Physical grade multiplier before the trainer-grade clamp. */
  trainerGradeScale: 1,
  maxTrainerGradePercent: 15,
} as const

export const FREE_RIDE_MARKINGS = {
  intensity: 0.72,
  panelSpacingMeters: 8,
  centerTraceWidthMeters: 0.08,
  gridSpacingMeters: 1.3,
} as const

export const FREE_RIDE_CITY = {
  density: "smooth",
  nearWindow: { spacing: 18, back: 50, ahead: 360 },
  farWindow: { spacing: 42, back: 80, ahead: 680 },
  megaWindow: { spacing: 95, back: 80, ahead: 620 },
  baseDropMeters: 90,
  nearLateralMinMeters: 24,
  nearLateralRangeMeters: 72,
  farLateralMinMeters: 115,
  farLateralRangeMeters: 240,
} as const

export const FREE_RIDE_FOG = {
  /** Exponential fog density — tuned with the long ribbon + scenery draw distance. */
  density: 0.0068,
} as const

export const FREE_RIDE_FX = {
  bloomIntensity: 1.05,
  bloomThreshold: 0.22,
  bloomSmoothing: 0.9,
  vignetteDarkness: 0.78,
  chromaticOffset: 0.00055,
  /** Clamp device pixel ratio so high-DPI screens stay smooth. */
  dpr: [1, 1.75] as [number, number],
} as const

/** Stable seed so the track + scenery layout is deterministic between sessions. */
export const FREE_RIDE_SEED = "ramp-free-ride-redout-v1"
