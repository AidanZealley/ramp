import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminLayout } from "./components/admin-layout"

let mockCurrentUser: unknown

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => mockCurrentUser),
}))

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: unknown) => options,
  Outlet: () => <div>Admin child route</div>,
}))

describe("AdminLayout", () => {
  beforeEach(() => {
    mockCurrentUser = {
      _id: "admin-1",
      email: "admin@example.com",
      role: "admin",
    }
  })

  it("shows loading while the current user query is unresolved", () => {
    mockCurrentUser = undefined

    render(<AdminLayout />)

    expect(screen.getByRole("status", { name: "Loading" })).toBeTruthy()
  })

  it("shows unauthorized when there is no current user", () => {
    mockCurrentUser = null

    render(<AdminLayout />)

    expect(screen.getByText("Unauthorized")).toBeTruthy()
    expect(
      screen.getByText("You do not have access to admin tools.")
    ).toBeTruthy()
  })

  it("shows unauthorized for non-admin users", () => {
    mockCurrentUser = { _id: "user-1", email: "user@example.com", role: "user" }

    render(<AdminLayout />)

    expect(screen.getByText("Unauthorized")).toBeTruthy()
  })

  it("renders the child outlet for admin users", () => {
    render(<AdminLayout />)

    expect(screen.getByText("Admin child route")).toBeTruthy()
  })
})
