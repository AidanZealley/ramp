import { act, renderHook, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useRouteSimulationRoute } from "./use-route-simulation-route"

const useQuery = vi.fn<(reference: unknown, args?: unknown) => unknown>()

vi.mock("convex/react", () => ({
  useQuery: (reference: unknown, args?: unknown) => useQuery(reference, args),
}))

const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ramp">
  <trk><name>Lunch Loop</name><trkseg>
    <trkpt lat="0" lon="0"><ele>100</ele></trkpt>
    <trkpt lat="0" lon="0.001"><ele>150</ele></trkpt>
    <trkpt lat="0" lon="0.002"><ele>125</ele></trkpt>
  </trkseg></trk>
</gpx>`

const routeDoc = {
  _id: "route-1",
  _creationTime: 0,
  title: "Lunch Loop",
  originalFileName: "lunch.gpx",
  fileUrl: "https://example.test/lunch.gpx",
}

const segmentDoc = {
  _id: "segment-1",
  type: "climb",
  startDistanceMeters: 25,
  endDistanceMeters: 75,
}

function mockQueries(segments: Array<typeof segmentDoc> = [segmentDoc]) {
  useQuery.mockImplementation((_reference, args) => {
    if (args === undefined) return [routeDoc]
    if (args && "id" in (args as Record<string, unknown>)) return routeDoc
    if (args && "routeId" in (args as Record<string, unknown>)) return segments
    return undefined
  })
}

describe("useRouteSimulationRoute", () => {
  beforeEach(() => {
    useQuery.mockReset()
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(gpx),
        })
      )
    )
  })

  it("returns the full parsed route with only routeId", async () => {
    mockQueries()
    const { result } = renderHook(() =>
      useRouteSimulationRoute({
        linkedRouteId: "route-1" as never,
        linkedRouteSegmentId: undefined,
        navigate: vi.fn() as never,
      })
    )

    await waitFor(() => expect(result.current.parsedRoute).not.toBeNull())

    expect(result.current.parsedRoute?.title).toBe("Lunch Loop")
    expect(result.current.parsedRoute?.stats.distanceMeters).toBeGreaterThan(100)
    expect(result.current.activeRouteTitle).toBe("Lunch Loop")
  })

  it("returns a sliced route with routeId and routeSegmentId", async () => {
    mockQueries()
    const { result } = renderHook(() =>
      useRouteSimulationRoute({
        linkedRouteId: "route-1" as never,
        linkedRouteSegmentId: "segment-1" as never,
        navigate: vi.fn() as never,
      })
    )

    await waitFor(() => expect(result.current.parsedRoute).not.toBeNull())

    expect(result.current.parsedRoute?.title).toBe("Lunch Loop - Climb 1")
    expect(result.current.activeRouteTitle).toBe("Lunch Loop - Climb 1")
    expect(result.current.parsedRoute?.stats.distanceMeters).toBeCloseTo(50)
    expect(result.current.parsedRoute?.points[0]?.distanceMeters).toBe(0)
  })

  it("sets a load error when the selected segment is missing", async () => {
    mockQueries([])
    const { result } = renderHook(() =>
      useRouteSimulationRoute({
        linkedRouteId: "route-1" as never,
        linkedRouteSegmentId: "segment-1" as never,
        navigate: vi.fn() as never,
      })
    )

    await waitFor(() =>
      expect(result.current.loadError).toBe(
        "Route segment not found. Pick another route."
      )
    )
  })

  it("clears routeSegmentId when selecting a different route", () => {
    mockQueries()
    const navigate = vi.fn()
    const { result } = renderHook(() =>
      useRouteSimulationRoute({
        linkedRouteId: "route-1" as never,
        linkedRouteSegmentId: "segment-1" as never,
        navigate: navigate as never,
      })
    )

    act(() => result.current.handleSelectRoute("route-2" as never))

    const search = navigate.mock.calls[0][0].search({
      routeId: "route-1",
      routeSegmentId: "segment-1",
    })
    expect(search).toEqual({ routeId: "route-2" })
  })
})
