import { describe, expect, it } from "vitest"
import { FREE_RIDE_ELEVATION } from "./free-ride-config"
import {
  createTrackSample,
  getLowerWorldY,
  getRacingLineOffset,
  getVisualTrackY,
  offsetAlongRight,
  sampleTrack,
  sampleTrackInto,
} from "./track"

function length(v: [number, number, number]): number {
  return Math.hypot(v[0], v[1], v[2])
}

describe("sampleTrack", () => {
  it("sampleTrackInto matches sampleTrack for representative distances", () => {
    const out = createTrackSample()

    for (const distance of [-25, 0, 12.5, 1234, 9876.5]) {
      const mutable = sampleTrackInto(distance, out)
      const fresh = sampleTrack(distance)

      expect(mutable.position).toEqual(fresh.position)
      expect(mutable.tangent).toEqual(fresh.tangent)
      expect(mutable.right).toEqual(fresh.right)
      expect(mutable.up).toEqual(fresh.up)
      expect(mutable.bank).toBe(fresh.bank)
      expect(mutable.grade).toBe(fresh.grade)
    }
  })

  it("sampleTrackInto reuses the provided sample and vector arrays", () => {
    const out = createTrackSample()
    const position = out.position
    const tangent = out.tangent
    const right = out.right
    const up = out.up

    expect(sampleTrackInto(100, out)).toBe(out)
    sampleTrackInto(200, out)

    expect(out.position).toBe(position)
    expect(out.tangent).toBe(tangent)
    expect(out.right).toBe(right)
    expect(out.up).toBe(up)
    expect(out.position[2]).toBe(200)
  })

  it("returns finite, well-formed samples across a long sweep", () => {
    for (let distance = 0; distance <= 20000; distance += 37) {
      const sample = sampleTrack(distance)
      for (const component of [
        ...sample.position,
        ...sample.tangent,
        ...sample.right,
        ...sample.up,
        sample.bank,
        sample.grade,
        getVisualTrackY(sample),
        getLowerWorldY(sample),
      ]) {
        expect(Number.isFinite(component)).toBe(true)
      }
      // Forward distance maps straight onto +Z.
      expect(sample.position[2]).toBeCloseTo(distance)
    }
  })

  it("produces unit-length tangent / right / up basis vectors", () => {
    for (let distance = 0; distance <= 5000; distance += 53) {
      const { tangent, right, up } = sampleTrack(distance)
      expect(length(tangent)).toBeCloseTo(1, 5)
      expect(length(right)).toBeCloseTo(1, 5)
      expect(length(up)).toBeCloseTo(1, 5)
    }
  })

  it("is continuous — adjacent samples stay close", () => {
    const step = 1
    let previous = sampleTrack(0)
    for (let distance = step; distance <= 4000; distance += step) {
      const current = sampleTrack(distance)
      const dx = current.position[0] - previous.position[0]
      const dy = current.position[1] - previous.position[1]
      const visualDy = getVisualTrackY(current) - getVisualTrackY(previous)
      // Lateral + vertical drift per metre is bounded (no discontinuities).
      expect(Math.hypot(dx, dy)).toBeLessThan(2)
      expect(Math.abs(visualDy)).toBeLessThan(1)
      previous = current
    }
  })

  it("keeps physical grade bounded and realistic", () => {
    for (let distance = 0; distance <= 20000; distance += 19) {
      const { grade } = sampleTrack(distance)
      expect(Math.abs(grade * 100)).toBeLessThanOrEqual(
        FREE_RIDE_ELEVATION.maxTrainerGradePercent + 1e-9
      )
    }
  })

  it("keeps visual height amplification separate from physical grade", () => {
    for (let distance = 0; distance <= 5000; distance += 41) {
      const sample = sampleTrack(distance)
      const gradeBefore = sample.grade
      expect(getVisualTrackY(sample)).toBeCloseTo(
        sample.position[1] * FREE_RIDE_ELEVATION.visualHeightScale,
        8
      )
      expect(sample.grade).toBe(gradeBefore)
    }
  })

  it("places the lower world below the visual road by the configured drop", () => {
    for (let distance = 0; distance <= 5000; distance += 47) {
      const sample = sampleTrack(distance)
      expect(getLowerWorldY(sample)).toBeCloseTo(
        getVisualTrackY(sample) - FREE_RIDE_ELEVATION.lowerCityDropMeters,
        8
      )
      expect(getLowerWorldY(sample)).toBeLessThan(getVisualTrackY(sample))
    }
  })

  it("banks into the turn (sign matches lateral curvature)", () => {
    let checked = 0
    for (let distance = 0; distance <= 8000; distance += 11) {
      const { bank } = sampleTrack(distance)
      // Discrete second derivative of the lateral (x) position = curvature.
      const curvature =
        sampleTrack(distance - 1).position[0] -
        2 * sampleTrack(distance).position[0] +
        sampleTrack(distance + 1).position[0]
      // Skip near-straight points where the sign is meaningless.
      if (Math.abs(curvature) < 1e-4 || Math.abs(bank) < 1e-3) continue
      expect(Math.sign(bank)).toBe(Math.sign(curvature))
      checked += 1
    }
    // Make sure we actually exercised some turning sections.
    expect(checked).toBeGreaterThan(50)
  })

  it("keeps the bank within its clamp", () => {
    for (let distance = 0; distance <= 8000; distance += 17) {
      const { bank } = sampleTrack(distance)
      expect(Math.abs(bank)).toBeLessThanOrEqual(0.52 + 1e-9)
    }
  })

  it("offsets symmetrically along the cross-section", () => {
    const sample = sampleTrack(1234)
    const left = offsetAlongRight(sample, -5)
    const right = offsetAlongRight(sample, 5)
    const mid: [number, number, number] = [
      (left[0] + right[0]) / 2,
      (left[1] + right[1]) / 2,
      (left[2] + right[2]) / 2,
    ]
    expect(mid[0]).toBeCloseTo(sample.position[0], 6)
    expect(mid[1]).toBeCloseTo(sample.position[1], 6)
    expect(mid[2]).toBeCloseTo(sample.position[2], 6)
  })

  it("returns finite racing-line offsets across a long sweep", () => {
    for (let distance = 0; distance <= 20000; distance += 23) {
      expect(Number.isFinite(getRacingLineOffset(distance))).toBe(true)
    }
  })

  it("keeps racing-line offsets inside the central deck", () => {
    for (let distance = 0; distance <= 20000; distance += 13) {
      expect(Math.abs(getRacingLineOffset(distance))).toBeLessThanOrEqual(
        1.8 + 1e-9
      )
    }
  })

  it("does not ride the racing-line clamp through turns", () => {
    for (let distance = 0; distance <= 20000; distance += 13) {
      expect(Math.abs(getRacingLineOffset(distance))).toBeLessThan(1.75)
    }
  })

  it("keeps near-straight sections centered", () => {
    let checked = 0

    for (let distance = 0; distance <= 20000; distance += 1) {
      const offset = getRacingLineOffset(distance)
      if (offset !== 0) continue

      const center = sampleTrack(distance).position[0]
      const curvature =
        sampleTrack(distance - 1).position[0] -
        2 * center +
        sampleTrack(distance + 1).position[0]

      expect(Math.abs(curvature)).toBeLessThan(0.004)
      checked += 1
      if (checked >= 25) break
    }

    expect(checked).toBeGreaterThanOrEqual(25)
  })

  it("changes racing-line offsets continuously between adjacent samples", () => {
    const step = 1
    let previous = getRacingLineOffset(0)

    for (let distance = step; distance <= 10000; distance += step) {
      const current = getRacingLineOffset(distance)
      expect(Math.abs(current - previous)).toBeLessThan(0.18)
      previous = current
    }
  })

  it("does not create racing-line offsets from high grade alone", () => {
    let checked = 0

    for (let distance = 0; distance <= 20000; distance += 1) {
      const sample = sampleTrack(distance)
      if (
        Math.abs(sample.grade * 100) <
        FREE_RIDE_ELEVATION.maxTrainerGradePercent * 0.75
      ) {
        continue
      }

      const offset = getRacingLineOffset(distance)
      const center = sample.position[0]
      const curvature =
        sampleTrack(distance - 1).position[0] -
        2 * center +
        sampleTrack(distance + 1).position[0]

      if (Math.abs(curvature) < 0.003 && Math.abs(offset) <= 0.2) {
        checked += 1
      }
    }

    expect(checked).toBeGreaterThan(5)
  })
})
