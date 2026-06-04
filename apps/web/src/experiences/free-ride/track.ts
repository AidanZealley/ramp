/**
 * Pure, deterministic track geometry for the Free Ride experience.
 *
 * The track centerline is an analytic function of `distance` (a sum of sines),
 * so `sampleTrack` is O(1), allocation-free in its hot path, and trivially
 * unit-testable without any three.js / WebGL dependency. The scene rebuilds the
 * ribbon every frame by re-sampling this function across a sliding window, which
 * gives a seamless treadmill with no chunk swapping.
 *
 * Convention: `distance` runs along +Z (forward). The path sweeps in X (turns)
 * and undulates in Y (physical elevation). `bank` leans the cross-section into
 * turns and is shared by the ribbon and camera so they stay consistent. Visual
 * height exaggeration is intentionally separate from the physical grade that is
 * dispatched to the trainer.
 */

import { FREE_RIDE_ELEVATION } from "./free-ride-config"

export type Vec3 = [number, number, number]

export type TrackSample = {
  /** World position of the centerline at this distance. */
  position: Vec3
  /** Unit forward direction. */
  tangent: Vec3
  /** Unit cross-section "right" vector, already rotated by `bank`. */
  right: Vec3
  /** Unit cross-section "up" vector, already rotated by `bank`. */
  up: Vec3
  /** Roll angle (radians) the track leans into the current turn. */
  bank: number
  /** Slope (dy/ddistance), used to drive trainer simulation grade. */
  grade: number
}

type Harmonic = { amp: number; len: number; phase: number }

// Incommensurate wavelengths keep the layout from visibly repeating.
const LATERAL: Array<Harmonic> = [
  { amp: 62, len: 150, phase: 0 },
  { amp: 30, len: 64, phase: 1.3 },
  { amp: 11, len: 103, phase: 2.1 },
]

const ELEVATION: Array<Harmonic> = [
  // Long rolling baseline: gives the causeway real altitude changes.
  { amp: 16, len: 520, phase: 0.45 },
  // Medium climb / descend waves: readable trainer-grade changes.
  { amp: 8, len: 220, phase: 1.55 },
  { amp: 3, len: 90, phase: 2.25 },
  // Small smoothing variation: breaks up the contour without grade spikes.
  { amp: 1.2, len: 45, phase: 0.9 },
]

const BANK_GAIN = 62
const MAX_BANK = 0.52
const MAX_RACING_LINE_OFFSET_METERS = 1.8

function sumSin(harmonics: Array<Harmonic>, s: number): number {
  let total = 0
  for (const h of harmonics) total += h.amp * Math.sin(s / h.len + h.phase)
  return total
}

/** First derivative (d/ds) of a sum-of-sines. */
function sumSinDeriv(harmonics: Array<Harmonic>, s: number): number {
  let total = 0
  for (const h of harmonics) total += (h.amp / h.len) * Math.cos(s / h.len + h.phase)
  return total
}

/** Second derivative (d²/ds²) of a sum-of-sines. */
function sumSinDeriv2(harmonics: Array<Harmonic>, s: number): number {
  let total = 0
  for (const h of harmonics) {
    total += -(h.amp / (h.len * h.len)) * Math.sin(s / h.len + h.phase)
  }
  return total
}

function lateralCurvatureAt(distance: number): number {
  return sumSinDeriv2(LATERAL, distance)
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1
  return [v[0] / len, v[1] / len, v[2] / len]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

export function sampleTrack(distance: number): TrackSample {
  const s = distance
  const x = sumSin(LATERAL, s)
  const y = sumSin(ELEVATION, s)

  const dx = sumSinDeriv(LATERAL, s)
  const dy = sumSinDeriv(ELEVATION, s)
  const tangent = normalize([dx, dy, 1])

  // Lean into the turn from the lateral curvature (second derivative).
  const curvature = sumSinDeriv2(LATERAL, s)
  const bank = clamp(curvature * BANK_GAIN, -MAX_BANK, MAX_BANK)

  // Horizontal "right" of travel, then a stable up perpendicular to both.
  const right0 = normalize([tangent[2], 0, -tangent[0]])
  const up0 = normalize(cross(tangent, right0))

  // Rotate the cross-section frame around the tangent by `bank`.
  const cb = Math.cos(bank)
  const sb = Math.sin(bank)
  const right: Vec3 = [
    right0[0] * cb - up0[0] * sb,
    right0[1] * cb - up0[1] * sb,
    right0[2] * cb - up0[2] * sb,
  ]
  const up: Vec3 = [
    right0[0] * sb + up0[0] * cb,
    right0[1] * sb + up0[1] * cb,
    right0[2] * sb + up0[2] * cb,
  ]

  const grade = clamp(
    dy * FREE_RIDE_ELEVATION.trainerGradeScale,
    -FREE_RIDE_ELEVATION.maxTrainerGradePercent / 100,
    FREE_RIDE_ELEVATION.maxTrainerGradePercent / 100
  )

  return {
    position: [x, y, s],
    tangent,
    right,
    up,
    bank,
    grade,
  }
}

/** Offset a point from the centerline along the (banked) cross-section right axis. */
export function offsetAlongRight(sample: TrackSample, lateral: number): Vec3 {
  return [
    sample.position[0] + sample.right[0] * lateral,
    sample.position[1] + sample.right[1] * lateral,
    sample.position[2] + sample.right[2] * lateral,
  ]
}

export function getRacingLineOffset(distance: number): number {
  const entryCurvature = lateralCurvatureAt(distance + 34)
  const apexCurvature = lateralCurvatureAt(distance + 14)
  const exitCurvature = lateralCurvatureAt(distance - 18)

  const apex = Math.tanh(apexCurvature * 120) * 3
  const entry = -Math.tanh(entryCurvature * 120) * 0.75
  const exit = -Math.tanh(exitCurvature * 120) * 0.4

  const rawOffset = apex + entry + exit
  return Math.abs(rawOffset) < 0.08
    ? 0
    : clamp(rawOffset, -MAX_RACING_LINE_OFFSET_METERS, MAX_RACING_LINE_OFFSET_METERS)
}

export function getVisualTrackY(sample: TrackSample): number {
  return sample.position[1] * FREE_RIDE_ELEVATION.visualHeightScale
}

export function getLowerWorldY(sample: TrackSample): number {
  return getVisualTrackY(sample) - FREE_RIDE_ELEVATION.lowerCityDropMeters
}

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}
