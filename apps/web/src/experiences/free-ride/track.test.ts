import { describe, expect, it } from "vitest"
import { offsetAlongRight, sampleTrack } from "./track"

function length(v: [number, number, number]): number {
  return Math.hypot(v[0], v[1], v[2])
}

describe("sampleTrack", () => {
  it("returns finite, well-formed samples across a long sweep", () => {
    for (let distance = 0; distance <= 20000; distance += 37) {
      const sample = sampleTrack(distance)
      for (const component of [...sample.position, ...sample.tangent, sample.bank, sample.grade]) {
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
      // Lateral + vertical drift per metre is bounded (no discontinuities).
      expect(Math.hypot(dx, dy)).toBeLessThan(2)
      previous = current
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
})
