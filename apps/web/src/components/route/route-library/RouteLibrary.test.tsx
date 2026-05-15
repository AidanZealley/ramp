import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { RouteLibrary } from "./RouteLibrary"

const useQuery = vi.fn<(reference: unknown) => unknown>()
const useMutation = vi.fn<(reference: unknown) => unknown>(() => vi.fn())
const useNavigate = vi.fn<(options?: unknown) => unknown>(() => vi.fn())

vi.mock("convex/react", () => ({
  useMutation: (reference: unknown) => useMutation(reference),
  useQuery: (reference: unknown) => useQuery(reference),
}))

vi.mock("@tanstack/react-router", async () => {
  const actual = await vi.importActual<typeof import("@tanstack/react-router")>(
    "@tanstack/react-router"
  )
  return {
    ...actual,
    useNavigate: (options?: unknown) => useNavigate(options),
  }
})

describe("RouteLibrary", () => {
  beforeEach(() => {
    useQuery.mockReset()
    useMutation.mockClear()
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
})
