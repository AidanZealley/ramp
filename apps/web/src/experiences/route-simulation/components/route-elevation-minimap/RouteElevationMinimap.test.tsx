import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RouteElevationMinimap } from "./RouteElevationMinimap"
import type { ElevationSample } from "@/lib/routes/types"
import {
  displayWeightToKg,
  formatDistanceMeters,
  formatElevationMeters,
  formatSpeedKph,
  formatSpeedMps,
  formatWeightKg,
  kgToDisplayWeight,
} from "@/lib/units"

vi.mock("@/hooks/use-unit-formatters", () => ({
  useUnitFormatters: () => ({
    unitSystem: "metric",
    preferencesReady: true,
    distance: (
      meters: number,
      options?: { precision?: number; compactUnderKm?: boolean }
    ) => formatDistanceMeters(meters, "metric", options),
    elevation: (meters: number | null | undefined) =>
      formatElevationMeters(meters, "metric"),
    speedKph: (kph: number | null | undefined) => formatSpeedKph(kph, "metric"),
    speedMps: (mps: number | null | undefined) => formatSpeedMps(mps, "metric"),
    weight: (kg: number) => formatWeightKg(kg, "metric"),
    weightValue: (kg: number) => kgToDisplayWeight(kg, "metric"),
    weightInputToKg: (value: number) => displayWeightToKg(value, "metric"),
  }),
}))

let animationFrameId = 0
let animationFrames = new Map<number, FrameRequestCallback>()

const samples = [
  { distanceMeters: 0, elevationMeters: 100 },
  { distanceMeters: 1000, elevationMeters: 200 },
]

const makeSamples = (totalDistanceMeters: number): Array<ElevationSample> =>
  Array.from({ length: 21 }, (_, index) => ({
    distanceMeters: (totalDistanceMeters / 20) * index,
    elevationMeters: 100 + Math.sin(index) * 30 + index,
  }))

const flushAnimation = () => {
  act(() => {
    for (const timestamp of [0, 220]) {
      const frames = Array.from(animationFrames.entries())
      animationFrames = new Map()

      for (const [, callback] of frames) {
        callback(timestamp)
      }
    }
  })
}

const getZoomOutButton = () =>
  screen.getByRole("button", { name: "Zoom elevation overview out" })

const getZoomInButton = () =>
  screen.getByRole("button", { name: "Zoom elevation overview in" })

const getPointForDistance = (container: HTMLElement, x: number) =>
  container
    .querySelector("polyline")
    ?.getAttribute("points")
    ?.split(" ")
    .find((point) => point.startsWith(`${x},`))

describe("RouteElevationMinimap", () => {
  beforeEach(() => {
    animationFrameId = 0
    animationFrames = new Map()
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
      animationFrameId += 1
      animationFrames.set(animationFrameId, callback)
      return animationFrameId
    })
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation((id) => {
      animationFrames.delete(id)
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("shows the current rider elevation", () => {
    render(
      <RouteElevationMinimap
        distanceMeters={500}
        riderElevationMeters={123.4}
        samples={samples}
        totalDistanceMeters={1000}
      />
    )

    expect(screen.getByText("Elevation")).toBeTruthy()
    expect(screen.getByText("123 m")).toBeTruthy()
  })

  it("falls back when rider elevation is unavailable", () => {
    render(
      <RouteElevationMinimap
        distanceMeters={500}
        riderElevationMeters={null}
        samples={samples}
        totalDistanceMeters={1000}
      />
    )

    expect(screen.getByText("--")).toBeTruthy()
  })

  it("renders the restyled area, thin elevation line, and thin marker", () => {
    const { container } = render(
      <RouteElevationMinimap
        distanceMeters={500}
        riderElevationMeters={123}
        samples={samples}
        totalDistanceMeters={1000}
      />
    )

    const polygon = container.querySelector("polygon")
    const polyline = container.querySelector("polyline")
    const marker = container.querySelector("line")

    expect(polygon?.getAttribute("fill")).toBe("var(--primary)")
    expect(polygon?.getAttribute("opacity")).toBe("0.18")
    expect(polyline?.getAttribute("stroke-width")).toBe("1")
    expect(marker?.getAttribute("stroke-width")).toBe("1")
  })

  it("renders zoom controls and toggles from all to quarter route length", () => {
    render(
      <RouteElevationMinimap
        distanceMeters={5000}
        riderElevationMeters={123}
        samples={makeSamples(10_000)}
        totalDistanceMeters={10_000}
      />
    )

    expect(screen.getByText("All")).toBeTruthy()
    expect((getZoomOutButton() as HTMLButtonElement).disabled).toBe(true)
    expect((getZoomInButton() as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(getZoomInButton())
    expect(screen.getByText("2.5 km")).toBeTruthy()
    expect((getZoomInButton() as HTMLButtonElement).disabled).toBe(true)
    expect((getZoomOutButton() as HTMLButtonElement).disabled).toBe(false)
  })

  it("rounds the quarter route zoom label to whole meters", () => {
    render(
      <RouteElevationMinimap
        distanceMeters={300}
        riderElevationMeters={123}
        samples={makeSamples(600)}
        totalDistanceMeters={600}
      />
    )

    expect(screen.getByText("All")).toBeTruthy()

    fireEvent.click(getZoomInButton())
    expect(screen.getByText("150 m")).toBeTruthy()
    expect(screen.queryByText("5 km")).toBeNull()
    expect((getZoomInButton() as HTMLButtonElement).disabled).toBe(true)
  })

  it("keeps only all when the rounded quarter window would match the route length", () => {
    render(
      <RouteElevationMinimap
        distanceMeters={0.5}
        riderElevationMeters={123}
        samples={makeSamples(1)}
        totalDistanceMeters={1}
      />
    )

    expect(screen.getByText("All")).toBeTruthy()
    expect((getZoomOutButton() as HTMLButtonElement).disabled).toBe(true)
    expect((getZoomInButton() as HTMLButtonElement).disabled).toBe(true)
  })

  it("places the marker near the upcoming-biased anchor at detailed zoom", () => {
    const { container } = render(
      <RouteElevationMinimap
        distanceMeters={5000}
        riderElevationMeters={123}
        samples={makeSamples(10_000)}
        totalDistanceMeters={10_000}
      />
    )

    fireEvent.click(getZoomInButton())

    flushAnimation()

    const markerX = Number(container.querySelector("line")?.getAttribute("x1"))
    expect(markerX).toBeGreaterThanOrEqual(19)
    expect(markerX).toBeLessThanOrEqual(21)
  })

  it("keeps the marker inside the chart near the finish", () => {
    const { container } = render(
      <RouteElevationMinimap
        distanceMeters={9990}
        riderElevationMeters={123}
        samples={makeSamples(10_000)}
        totalDistanceMeters={10_000}
      />
    )

    fireEvent.click(getZoomInButton())

    flushAnimation()

    const markerX = Number(container.querySelector("line")?.getAttribute("x1"))
    expect(markerX).toBeGreaterThanOrEqual(0)
    expect(markerX).toBeLessThanOrEqual(100)
  })

  it("keeps the elevation scale fixed as the window moves", () => {
    const routeSamples = [
      { distanceMeters: 0, elevationMeters: 0 },
      { distanceMeters: 2000, elevationMeters: 100 },
      { distanceMeters: 5000, elevationMeters: 50 },
      { distanceMeters: 8000, elevationMeters: 100 },
      { distanceMeters: 10_000, elevationMeters: 200 },
    ]
    const { container, rerender } = render(
      <RouteElevationMinimap
        distanceMeters={5000}
        riderElevationMeters={123}
        samples={routeSamples}
        totalDistanceMeters={10_000}
      />
    )

    fireEvent.click(getZoomInButton())
    flushAnimation()

    const firstSampleY = getPointForDistance(container, 100)?.split(",")[1]

    rerender(
      <RouteElevationMinimap
        distanceMeters={8000}
        riderElevationMeters={123}
        samples={routeSamples}
        totalDistanceMeters={10_000}
      />
    )
    flushAnimation()

    const secondSampleY = getPointForDistance(container, 20)?.split(",")[1]

    expect(firstSampleY).toBeDefined()
    expect(secondSampleY).toBe(firstSampleY)
  })

  it("exaggerates the elevation scale as the zoom gets more detailed", () => {
    const routeSamples = [
      { distanceMeters: 0, elevationMeters: 0 },
      { distanceMeters: 5000, elevationMeters: 90 },
      { distanceMeters: 10_000, elevationMeters: 200 },
    ]
    const { container } = render(
      <RouteElevationMinimap
        distanceMeters={5000}
        riderElevationMeters={123}
        samples={routeSamples}
        totalDistanceMeters={10_000}
      />
    )

    const fullRoutePoint = getPointForDistance(container, 50)
    const fullRouteY = Number(fullRoutePoint?.split(",")[1])

    fireEvent.click(getZoomInButton())
    flushAnimation()

    const detailedPoint = getPointForDistance(container, 20)
    const detailedY = Number(detailedPoint?.split(",")[1])

    expect(fullRouteY).toBeGreaterThan(55)
    expect(detailedY).toBeGreaterThan(fullRouteY)
  })

  it("adds padding above elevation peaks", () => {
    const { container } = render(
      <RouteElevationMinimap
        distanceMeters={500}
        riderElevationMeters={123}
        samples={samples}
        totalDistanceMeters={1000}
      />
    )

    const peakY = Number(getPointForDistance(container, 100)?.split(",")[1])

    expect(peakY).toBeGreaterThan(0)
  })

  it("handles invalid total distances without NaN SVG attributes", () => {
    const { container } = render(
      <RouteElevationMinimap
        distanceMeters={500}
        riderElevationMeters={Number.NaN}
        samples={samples}
        totalDistanceMeters={0}
      />
    )

    const svgMarkup = container.querySelector("svg")?.outerHTML ?? ""
    expect(svgMarkup).not.toContain("NaN")
    expect(screen.getByText("--")).toBeTruthy()
  })
})
