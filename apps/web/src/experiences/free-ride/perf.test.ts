import { afterEach, describe, expect, it } from "vitest"
import {
  installFreeRidePerfProbe,
  measureFreeRideSection,
  recordFreeRideFrame,
} from "./perf"
import type { WebGLRenderer } from "three"

describe("free ride perf probe", () => {
  afterEach(() => {
    delete window.__freeRidePerf
  })

  it("is a no-op when the dev gate is disabled", () => {
    const gl = { info: { render: { calls: 1 } } } as unknown as WebGLRenderer

    installFreeRidePerfProbe(gl)
    recordFreeRideFrame(1 / 60)
    const value = measureFreeRideSection("camera", () => 42)

    expect(value).toBe(42)
    expect(window.__freeRidePerf).toBeUndefined()
  })
})
