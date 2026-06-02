/**
 * Tunable constants for the Free Ride experience. Keeping the palette, motion,
 * camera, fog and post-processing numbers in one place makes it easy to retune
 * the Redout-style look without hunting through the scene graph.
 */

export const FREE_RIDE_PALETTE = {
  /** Deep dusk sky, top to horizon. */
  skyTop: "#05030f",
  skyHorizon: "#3a0f4d",
  /** Matches fog to the horizon so distant geometry dissolves into the sky. */
  fog: "#250a3a",
  /** Track surface (kept dark so the neon edges read). */
  trackSurface: "#0a0712",
  trackUnderglow: "#1b0b3a",
  /** Neon accents. */
  neonCyan: "#19f4ff",
  neonMagenta: "#ff2bd6",
  neonOrange: "#ff7a18",
  neonViolet: "#7a4bff",
  scenery: "#160a2e",
  sceneryRim: "#5e2bff",
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

export const FREE_RIDE_FOG = {
  /** Exponential fog density — tuned with the long ribbon + scenery draw distance. */
  density: 0.0085,
} as const

export const FREE_RIDE_FX = {
  bloomIntensity: 1.5,
  bloomThreshold: 0.18,
  bloomSmoothing: 0.9,
  vignetteDarkness: 0.85,
  chromaticOffset: 0.0009,
  /** Clamp device pixel ratio so high-DPI screens stay smooth. */
  dpr: [1, 1.75] as [number, number],
} as const

/** Stable seed so the track + scenery layout is deterministic between sessions. */
export const FREE_RIDE_SEED = "ramp-free-ride-redout-v1"
