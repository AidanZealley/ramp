import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteLibrary } from "./RouteLibrary"
import type * as TanstackReactRouter from "@tanstack/react-router"

const useQuery = vi.fn<(reference: unknown) => unknown>()
const useMutation = vi.fn<(reference: unknown) => unknown>(() => vi.fn())
const navigate = vi.fn()
const useNavigate = vi.fn<(options?: unknown) => unknown>(() => navigate)
const generatedSegments = [
  {
    type: "climb" as const,
    startDistanceMeters: 0,
    endDistanceMeters: 600,
    distanceMeters: 600,
    startElevationMeters: 100,
    endElevationMeters: 140,
    elevationGainMeters: 40,
    averageGradient: 40 / 600,
    previewSamples: [
      { distanceMeters: 0, elevationMeters: 100 },
      { distanceMeters: 600, elevationMeters: 140 },
    ],
  },
]

vi.mock("convex/react", () => ({
  useMutation: (reference: unknown) => useMutation(reference),
  useQuery: (reference: unknown) => useQuery(reference),
}))

vi.mock("@/lib/routes/gpx", () => ({
  parseRouteGpxFile: vi.fn(() => Promise.resolve({
    kind: "success",
    route: {
      title: "Climb Route",
      points: [],
      stats: {
        distanceMeters: 600,
        elevationGainMeters: 40,
        elevationLossMeters: 0,
        minElevationMeters: 100,
        maxElevationMeters: 140,
        pointCount: 2,
      },
      bounds: null,
      start: null,
      finish: null,
      previewPoints: [],
    },
  })),
}))

vi.mock("@/lib/routes/segments", () => ({
  detectRouteSegments: vi.fn(() => generatedSegments),
}))

vi.mock("@tanstack/react-router", async () => {
  const actual =
    await vi.importActual<typeof TanstackReactRouter>("@tanstack/react-router")
  return {
    ...actual,
    useNavigate: (options?: unknown) => useNavigate(options),
  }
})

describe("RouteLibrary", () => {
  beforeEach(() => {
    useQuery.mockReset()
    useMutation.mockReset()
    navigate.mockReset()
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ storageId: "storage-1" }),
      }))
    )
  })

  it("renders loading state", () => {
    useQuery.mockReturnValue(undefined)

    const { container } = render(<RouteLibrary />)

    expect(container.querySelector(".animate-pulse")).not.toBeNull()
  })

  it("renders the empty state", () => {
    useQuery.mockReturnValue([])

    render(<RouteLibrary />)

    expect(screen.getByRole("button", { name: /upload gpx/i })).toBeTruthy()
    expect(screen.getByText(/No routes yet/i)).toBeTruthy()
  })

  it("passes generated route segments to createFromGpxUpload", async () => {
    const generateUploadUrl = vi.fn(() =>
      Promise.resolve("https://example.test/upload")
    )
    const createFromGpxUpload = vi.fn((_args: { segments: Array<unknown> }) =>
      Promise.resolve("route-1")
    )
    useQuery.mockReturnValue([])
    useMutation
      .mockReturnValueOnce(generateUploadUrl)
      .mockReturnValueOnce(createFromGpxUpload)

    const { container } = render(<RouteLibrary />)
    const input = container.querySelector('input[type="file"]')
    expect(input).not.toBeNull()

    fireEvent.change(input as HTMLInputElement, {
      target: {
        files: [
          new File(["<gpx />"], "climb.gpx", {
            type: "application/gpx+xml",
          }),
        ],
      },
    })

    await waitFor(() => expect(createFromGpxUpload).toHaveBeenCalled())
    const createArgs = createFromGpxUpload.mock.calls[0]?.[0]
    expect(createArgs).toBeDefined()
    expect(createArgs.segments.length).toBeGreaterThan(0)
    expect(navigate).toHaveBeenCalledWith({
      to: "/route/$id",
      params: { id: "route-1" },
    })
  })
})
