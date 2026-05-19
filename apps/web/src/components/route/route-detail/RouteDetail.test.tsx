import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteDetail } from "./RouteDetail"
import type * as TanstackReactRouter from "@tanstack/react-router"

const useQuery = vi.fn<(reference: unknown, args?: unknown) => unknown>()

vi.mock("convex/react", () => ({
  useQuery: (reference: unknown, args?: unknown) => useQuery(reference, args),
}))

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof TanstackReactRouter>("@tanstack/react-router")
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
      const query = search?.routeId ? `?routeId=${search.routeId}` : ""
      return <a href={`${href}${query}`}>{children}</a>
    },
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

  it("links the Ride Route button to route simulation", () => {
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

    expect(
      screen.getByRole("link", { name: /ride route/i }).getAttribute("href")
    ).toBe("/ride/route?routeId=route-1")
    expect(screen.getByText("Lunch Loop")).toBeTruthy()
  })
})
