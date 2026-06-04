import type { WebGLRenderer } from "three"

type SectionName =
  | "camera"
  | "trackRibbon"
  | "scenery"
  | "trackEdges"
  | "floatingStructures"

type SectionSnapshot = {
  count: number
  p50: number
  p95: number
  p99: number
}

type FreeRidePerfSnapshot = {
  frames: number
  frameDeltaMs: {
    p50: number
    p95: number
    p99: number
  }
  fps: {
    p50: number
    p95Low: number
  }
  sections: Partial<Record<SectionName, SectionSnapshot>>
  renderer: WebGLRenderer["info"]["render"] | null
}

type FreeRidePerfApi = {
  snapshot: () => FreeRidePerfSnapshot
  reset: () => void
}

declare global {
  interface Window {
    __freeRidePerf?: FreeRidePerfApi
  }
}

const MAX_SAMPLES = 3600
const SECTION_NAMES: Array<SectionName> = [
  "camera",
  "trackRibbon",
  "scenery",
  "trackEdges",
  "floatingStructures",
]

let frameDeltas: Array<number> = []
const sectionTimings = new Map<SectionName, Array<number>>()
let renderer: WebGLRenderer | null = null
let enabled: boolean | null = null

function shouldEnableFreeRidePerf(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false

  const params = new URLSearchParams(window.location.search)
  if (params.get("freeRidePerf") === "1") return true

  try {
    return window.localStorage.getItem("freeRidePerf") === "1"
  } catch {
    return false
  }
}

function isEnabled(): boolean {
  if (enabled === null) enabled = shouldEnableFreeRidePerf()
  return enabled
}

function pushSample(samples: Array<number>, value: number): void {
  samples.push(value)
  if (samples.length > MAX_SAMPLES) samples.shift()
}

function percentile(samples: Array<number>, p: number): number {
  if (samples.length === 0) return 0
  const sorted = [...samples].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))
  return sorted[index]
}

function sectionSnapshot(samples: Array<number>): SectionSnapshot {
  return {
    count: samples.length,
    p50: percentile(samples, 0.5),
    p95: percentile(samples, 0.95),
    p99: percentile(samples, 0.99),
  }
}

function snapshot(): FreeRidePerfSnapshot {
  const fpsSamples = frameDeltas.map((deltaMs) =>
    deltaMs > 0 ? 1000 / deltaMs : 0
  )
  const sections: Partial<Record<SectionName, SectionSnapshot>> = {}

  for (const name of SECTION_NAMES) {
    const samples = sectionTimings.get(name)
    if (samples) sections[name] = sectionSnapshot(samples)
  }

  return {
    frames: frameDeltas.length,
    frameDeltaMs: {
      p50: percentile(frameDeltas, 0.5),
      p95: percentile(frameDeltas, 0.95),
      p99: percentile(frameDeltas, 0.99),
    },
    fps: {
      p50: percentile(fpsSamples, 0.5),
      p95Low: percentile(fpsSamples, 0.05),
    },
    sections,
    renderer: renderer?.info.render ?? null,
  }
}

function reset(): void {
  frameDeltas = []
  sectionTimings.clear()
}

export function installFreeRidePerfProbe(gl: WebGLRenderer): void {
  if (!isEnabled()) return
  renderer = gl
  window.__freeRidePerf = { snapshot, reset }
}

export function recordFreeRideFrame(deltaSeconds: number): void {
  if (!isEnabled()) return
  pushSample(frameDeltas, deltaSeconds * 1000)
}

export function measureFreeRideSection<T>(name: SectionName, fn: () => T): T {
  if (!isEnabled()) return fn()

  const start = performance.now()
  try {
    return fn()
  } finally {
    const samples = sectionTimings.get(name) ?? []
    pushSample(samples, performance.now() - start)
    sectionTimings.set(name, samples)
  }
}
