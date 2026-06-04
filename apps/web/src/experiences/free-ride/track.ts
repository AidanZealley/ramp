/**
 * Pure, deterministic track geometry for the Free Ride experience.
 *
 * The track centerline is an analytic function of `distance` (a sum of sines),
 * so `sampleTrackInto` is O(1), allocation-free in its hot path, and trivially
 * unit-testable without any three.js / WebGL dependency. The scene rebuilds the
 * ribbon every frame by re-sampling this function across a sliding window, which
 * gives a seamless treadmill with no chunk swapping. `sampleTrack` remains a
 * fresh-object wrapper for tests and non-hot-path callers.
 *
 * Convention: `distance` runs along +Z (forward). The path sweeps in X (turns)
 * and undulates in Y (physical elevation). `bank` leans the cross-section into
 * turns and is shared by the ribbon and camera so they stay consistent. Visual
 * height exaggeration is intentionally separate from the physical grade that is
 * dispatched to the trainer.
 */

import { FREE_RIDE_ELEVATION } from "./free-ride-config"

export type Vec3 = [number, number, number]

export type MutableTrackSample = {
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

export type TrackSample = MutableTrackSample

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
  for (const h of harmonics)
    total += (h.amp / h.len) * Math.cos(s / h.len + h.phase)
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

export function getLateralCurvature(distance: number): number {
  return sumSinDeriv2(LATERAL, distance)
}

function normalizeComponentsInto(
  x: number,
  y: number,
  z: number,
  out: Vec3
): Vec3 {
  const len = Math.hypot(x, y, z) || 1
  out[0] = x / len
  out[1] = y / len
  out[2] = z / len
  return out
}

function crossComponentsInto(
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  out: Vec3
): Vec3 {
  const x = ay * bz - az * by
  const y = az * bx - ax * bz
  const z = ax * by - ay * bx
  out[0] = x
  out[1] = y
  out[2] = z
  return out
}

export function createTrackSample(): MutableTrackSample {
  return {
    position: [0, 0, 0],
    tangent: [0, 0, 1],
    right: [1, 0, 0],
    up: [0, 1, 0],
    bank: 0,
    grade: 0,
  }
}

export function sampleTrackInto(
  distance: number,
  out: MutableTrackSample
): MutableTrackSample {
  const s = distance
  const x = sumSin(LATERAL, s)
  const y = sumSin(ELEVATION, s)

  const dx = sumSinDeriv(LATERAL, s)
  const dy = sumSinDeriv(ELEVATION, s)
  normalizeComponentsInto(dx, dy, 1, out.tangent)

  // Lean into the turn from the lateral curvature (second derivative).
  const curvature = getLateralCurvature(s)
  const bank = clamp(curvature * BANK_GAIN, -MAX_BANK, MAX_BANK)

  // Horizontal "right" of travel, then a stable up perpendicular to both.
  const right0x = out.tangent[2]
  const right0y = 0
  const right0z = -out.tangent[0]
  const right0Len = Math.hypot(right0x, right0y, right0z) || 1
  const rightX = right0x / right0Len
  const rightY = right0y / right0Len
  const rightZ = right0z / right0Len
  crossComponentsInto(
    out.tangent[0],
    out.tangent[1],
    out.tangent[2],
    rightX,
    rightY,
    rightZ,
    out.up
  )
  normalizeComponentsInto(out.up[0], out.up[1], out.up[2], out.up)

  // Rotate the cross-section frame around the tangent by `bank`.
  const cb = Math.cos(bank)
  const sb = Math.sin(bank)
  const upX = out.up[0]
  const upY = out.up[1]
  const upZ = out.up[2]
  out.right[0] = rightX * cb - upX * sb
  out.right[1] = rightY * cb - upY * sb
  out.right[2] = rightZ * cb - upZ * sb
  out.up[0] = rightX * sb + upX * cb
  out.up[1] = rightY * sb + upY * cb
  out.up[2] = rightZ * sb + upZ * cb

  const grade = clamp(
    dy * FREE_RIDE_ELEVATION.trainerGradeScale,
    -FREE_RIDE_ELEVATION.maxTrainerGradePercent / 100,
    FREE_RIDE_ELEVATION.maxTrainerGradePercent / 100
  )

  out.position[0] = x
  out.position[1] = y
  out.position[2] = s
  out.bank = bank
  out.grade = grade
  return out
}

export function sampleTrack(distance: number): TrackSample {
  return sampleTrackInto(distance, createTrackSample())
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
  const entryCurvature = getLateralCurvature(distance + 34)
  const apexCurvature = getLateralCurvature(distance + 14)
  const exitCurvature = getLateralCurvature(distance - 18)

  const apex = Math.tanh(apexCurvature * 120) * 3
  const entry = -Math.tanh(entryCurvature * 120) * 0.75
  const exit = -Math.tanh(exitCurvature * 120) * 0.4

  const rawOffset = apex + entry + exit
  return Math.abs(rawOffset) < 0.08
    ? 0
    : clamp(
        rawOffset,
        -MAX_RACING_LINE_OFFSET_METERS,
        MAX_RACING_LINE_OFFSET_METERS
      )
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
