import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AdminInvites } from "./AdminInvites"

const mockCreate = vi.fn()
const mockRevoke = vi.fn()
let mockInvites: unknown
let mutationCalls = 0

vi.mock("convex/react", () => ({
  useQuery: vi.fn(() => mockInvites),
  useMutation: vi.fn(() => {
    mutationCalls += 1
    return mutationCalls % 2 === 1 ? mockCreate : mockRevoke
  }),
}))

describe("AdminInvites", () => {
  beforeEach(() => {
    mockCreate.mockReset()
    mockRevoke.mockReset()
    mutationCalls = 0
    mockInvites = [
      {
        _id: "invite-1",
        email: "pending@example.com",
        createdAt: Date.UTC(2026, 0, 1),
        createdBy: "admin-1",
        status: "pending",
      },
      {
        _id: "invite-2",
        email: "used@example.com",
        createdAt: Date.UTC(2026, 0, 2),
        createdBy: "admin-1",
        usedAt: Date.UTC(2026, 0, 3),
        usedBy: "user-1",
        status: "used",
      },
      {
        _id: "invite-3",
        email: "revoked@example.com",
        createdAt: Date.UTC(2026, 0, 4),
        createdBy: "admin-1",
        revokedAt: Date.UTC(2026, 0, 5),
        status: "revoked",
      },
    ]
  })

  it("renders invite list states", () => {
    render(<AdminInvites />)

    expect(screen.getByText("pending@example.com")).toBeTruthy()
    expect(screen.getByText("used@example.com")).toBeTruthy()
    expect(screen.getByText("revoked@example.com")).toBeTruthy()
    expect(screen.getByText("Pending")).toBeTruthy()
    expect(screen.getAllByText("Used").length).toBeGreaterThan(0)
    expect(screen.getByText("Revoked")).toBeTruthy()
  })

  it("creates an invite and displays the returned code once", async () => {
    mockCreate.mockResolvedValueOnce({
      inviteId: "invite-4",
      code: "ABCD-EFGH",
    })
    render(<AdminInvites />)

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "new@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Create" }))

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith({ email: "new@example.com" })
    )
    expect(screen.getByDisplayValue("ABCD-EFGH")).toBeTruthy()
    expect(screen.getByText("Invite code shown once")).toBeTruthy()
  })

  it("only allows pending invites to be revoked", async () => {
    mockRevoke.mockResolvedValueOnce(null)
    render(<AdminInvites />)

    const revokeButtons = screen.getAllByRole("button", { name: "Revoke" })
    expect(revokeButtons).toHaveLength(1)

    fireEvent.click(revokeButtons[0])
    await waitFor(() =>
      expect(mockRevoke).toHaveBeenCalledWith({ inviteId: "invite-1" })
    )
  })
})
