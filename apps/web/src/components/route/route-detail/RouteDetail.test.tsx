import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteDetail } from "./RouteDetail"

const useQuery = vi.fn<(reference: unknown, args?: unknown) => unknown>()

vi.mock("convex/react", () => ({
  useQuery: (reference: unknown, args?: unknown) => useQuery(reference, args),
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  )
  return {
    ...actual,
    Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  }
})

describe("RouteDetail", () => {
  beforeEach(() => {
    useQuery.mockReset()
  })

  it("renders a not-found state", () => {
    useQuery.mockReturnValue(null)

    render(<RouteDetail routeId={"missing" as never} />)

    expect(screen.getByText("Route not found")).toBeTruthy()
  })

  it("renders the no-op Ride Route button", () => {
    useQuery.mockReturnValue({
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
      fileUrl: null,
    })

    render(<RouteDetail routeId={"route-1" as never} />)

    expect(screen.getByRole("button", { name: /ride route/i })).toBeTruthy()
    expect(screen.getByText("Lunch Loop")).toBeTruthy()
  })
})
