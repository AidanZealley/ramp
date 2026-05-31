import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteDetail } from "./RouteDetail"
import type * as TanstackReactRouter from "@tanstack/react-router"

const useQuery = vi.fn<(reference: unknown, args?: unknown) => unknown>()
const replaceRouteSegments = vi.fn()
const deleteRouteSegment = vi.fn()
let mutationCall = 0
const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ramp">
  <trk><name>Lunch Loop</name><trkseg>
    <trkpt lat="40" lon="-105"><ele>100</ele></trkpt>
    <trkpt lat="40.01" lon="-105.01"><ele>160</ele></trkpt>
  </trkseg></trk>
</gpx>`

const routeDoc = {
  _id: "route-1",
  _creationTime: 0,
  title: "Lunch Loop",
  source: "gpx",
  fileStorageId: "storage-1",
  originalFileName: "lunch.gpx",
  contentType: "application/gpx+xml",
  fileSizeBytes: 100,
  stats: {
    distanceMeters: 1609.344,
    elevationGainMeters: 100,
    elevationLossMeters: 50,
    minElevationMeters: 10,
    maxElevationMeters: 110,
    pointCount: 2,
  },
  bounds: null,
  start: null,
  finish: null,
  previewPoints: [],
  fileUrl: "https://example.test/lunch.gpx",
}

vi.mock("convex/react", () => ({
  useMutation: () => {
    mutationCall += 1
    return mutationCall === 1 ? replaceRouteSegments : deleteRouteSegment
  },
  useQuery: (reference: unknown, args?: unknown) => useQuery(reference, args),
}))

vi.mock("@/components/route/route-preview-map", () => ({
  RoutePreviewMap: () => <div data-testid="route-preview-map" />,
}))

vi.mock("@/components/route/elevation-chart", () => ({
  ElevationChart: () => <div data-testid="elevation-chart" />,
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof TanstackReactRouter>(
    "@tanstack/react-router"
  )
  return {
    ...actual,
    Link: ({
      children,
      params,
      search,
      to,
    }: {
      children: React.ReactNode
      params?: Record<string, string>
      search?: Record<string, string>
      to: string
    }) => {
      const href = to.replace(
        "$experienceId",
        params?.experienceId ?? "$experienceId"
      )
      const queryParams = new URLSearchParams()
      if (search?.routeId) queryParams.set("routeId", search.routeId)
      if (search?.routeSegmentId) {
        queryParams.set("routeSegmentId", search.routeSegmentId)
      }
      const query = queryParams.size > 0 ? `?${queryParams.toString()}` : ""
      return <a href={`${href}${query}`}>{children}</a>
    },
  }
})

describe("RouteDetail", () => {
  beforeEach(() => {
    useQuery.mockReset()
    replaceRouteSegments.mockReset()
    deleteRouteSegment.mockReset()
    mutationCall = 0
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

  it("renders a not-found state", () => {
    useQuery.mockReturnValueOnce(null)

    render(<RouteDetail routeId={"missing" as never} />)

    expect(screen.getByText("Route not found")).toBeTruthy()
  })

  it("links the Ride Route button to route simulation", () => {
    useQuery.mockImplementation((_reference, args) => {
      if (args && "id" in (args as Record<string, unknown>)) return routeDoc
      if (args && "routeId" in (args as Record<string, unknown>)) return []
      return undefined
    })

    render(<RouteDetail routeId={"route-1" as never} />)

    expect(
      screen.getByRole("link", { name: /ride route/i }).getAttribute("href")
    ).toBe("/ride/route?routeId=route-1")
    expect(screen.getByText("Lunch Loop")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Segments" })).toBeTruthy()
    expect(
      screen.getByRole("button", { name: /generate segments/i })
    ).toBeTruthy()
  })

  it("shows regenerate controls and climb segment details", async () => {
    useQuery.mockImplementation((_reference, args) => {
      if (args && "id" in (args as Record<string, unknown>)) return routeDoc
      if (!args || !("routeId" in (args as Record<string, unknown>))) {
        return undefined
      }
      return [
        {
          _id: "segment-1",
          type: "climb",
          startDistanceMeters: 0,
          endDistanceMeters: 1000,
          distanceMeters: 1000,
          startElevationMeters: 100,
          endElevationMeters: 152,
          elevationGainMeters: 52,
          averageGradient: 0.052,
          previewSamples: [
            { distanceMeters: 0, elevationMeters: 100 },
            { distanceMeters: 1000, elevationMeters: 152 },
          ],
        },
      ]
    })

    render(<RouteDetail routeId={"route-1" as never} />)

    expect(screen.getByText("Climb")).toBeTruthy()
    expect(
      screen.getByRole("link", { name: /ride segment/i }).getAttribute("href")
    ).toBe("/ride/route?routeId=route-1&routeSegmentId=segment-1")
    expect(screen.getByText("1.0 km")).toBeTruthy()
    expect(screen.getByText("52 m")).toBeTruthy()
    expect(screen.getByText("5.2%")).toBeTruthy()
    await waitFor(() =>
      expect(
        screen
          .getByRole("button", { name: /regenerate segments/i })
          .hasAttribute("disabled")
      ).toBe(false)
    )
    fireEvent.click(
      screen.getByRole("button", { name: /regenerate segments/i })
    )
    expect(screen.getByText("Regenerate segments?")).toBeTruthy()
  })

  it("deletes an individual segment after confirmation", async () => {
    useQuery.mockImplementation((_reference, args) => {
      if (args && "id" in (args as Record<string, unknown>)) return routeDoc
      if (!args || !("routeId" in (args as Record<string, unknown>))) {
        return undefined
      }
      return [
        {
          _id: "segment-1",
          type: "climb",
          startDistanceMeters: 0,
          endDistanceMeters: 1000,
          distanceMeters: 1000,
          startElevationMeters: 100,
          endElevationMeters: 152,
          elevationGainMeters: 52,
          averageGradient: 0.052,
          previewSamples: [
            { distanceMeters: 0, elevationMeters: 100 },
            { distanceMeters: 1000, elevationMeters: 152 },
          ],
        },
      ]
    })

    render(<RouteDetail routeId={"route-1" as never} />)

    fireEvent.click(screen.getByRole("button", { name: /delete segment/i }))
    expect(screen.getByText("Delete segment?")).toBeTruthy()
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    await waitFor(() =>
      expect(deleteRouteSegment).toHaveBeenCalledWith({
        segmentId: "segment-1",
      })
    )
  })
})
