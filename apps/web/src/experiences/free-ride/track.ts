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
 * and undulates gently in Y (elevation). `bank` leans the cross-section into
 * turns — the signature Redout feel — and is shared by the ribbon and camera so
 * they stay consistent.
 */

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
  { amp: 6.5, len: 190, phase: 0.6 },
  { amp: 2.4, len: 74, phase: 1.9 },
]

const BANK_GAIN = 62
const MAX_BANK = 0.52

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

  return {
    position: [x, y, s],
    tangent,
    right,
    up,
    bank,
    grade: dy,
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

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value
}
