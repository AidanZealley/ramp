import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AuthScreen } from "./AuthScreen"

const mockSignIn = vi.fn()

vi.mock("@convex-dev/auth/react", () => ({
  useAuthActions: () => ({ signIn: mockSignIn }),
}))

function fillCredentials(email = "rider@example.com", password = "secret123") {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: email },
  })
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: password },
  })
}

function submittedFormData() {
  const formData = mockSignIn.mock.calls[0]?.[1]
  expect(formData).toBeInstanceOf(FormData)
  return formData as FormData
}

function clickSubmitButton(name: string) {
  const button = screen
    .getAllByRole("button", { name })
    .find((element) => element.getAttribute("type") === "submit")
  expect(button).toBeDefined()
  fireEvent.click(button!)
}

describe("AuthScreen", () => {
  beforeEach(() => {
    mockSignIn.mockReset()
  })

  it("submits sign-in credentials to the password provider", async () => {
    render(<AuthScreen />)

    fillCredentials()
    clickSubmitButton("Sign in")

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1))
    expect(mockSignIn.mock.calls[0]?.[0]).toBe("password")

    const formData = submittedFormData()
    expect(formData.get("flow")).toBe("signIn")
    expect(formData.get("email")).toBe("rider@example.com")
    expect(formData.get("password")).toBe("secret123")
  })

  it("submits sign-up credentials with the sign-up flow", async () => {
    render(<AuthScreen />)

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }))
    fillCredentials("new-rider@example.com", "new-secret123")
    fireEvent.change(screen.getByLabelText("Invite code"), {
      target: { value: "ABCD-EFGH" },
    })
    clickSubmitButton("Create account")

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1))

    const formData = submittedFormData()
    expect(formData.get("flow")).toBe("signUp")
    expect(formData.get("email")).toBe("new-rider@example.com")
    expect(formData.get("password")).toBe("new-secret123")
    expect(formData.get("inviteCode")).toBe("ABCD-EFGH")
  })

  it("only shows the invite code field during sign-up", () => {
    render(<AuthScreen />)

    expect(screen.queryByLabelText("Invite code")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }))

    expect(screen.getByLabelText("Invite code")).toBeTruthy()
  })

  it("shows a sign-in error when sign-in is rejected", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("bad credentials"))
    render(<AuthScreen />)

    fillCredentials()
    clickSubmitButton("Sign in")

    expect(
      await screen.findByText("Could not sign in with those credentials.")
    ).toBeTruthy()
  })

  it("shows a sign-up error when sign-up is rejected", async () => {
    mockSignIn.mockRejectedValueOnce(new Error("bad credentials"))
    render(<AuthScreen />)

    fireEvent.click(screen.getByRole("button", { name: "Sign up" }))
    fillCredentials()
    fireEvent.change(screen.getByLabelText("Invite code"), {
      target: { value: "ABCD-EFGH" },
    })
    clickSubmitButton("Create account")

    expect(
      await screen.findByText(
        "Could not create an account. Check your email, password, and invite code."
      )
    ).toBeTruthy()
  })

  it("disables submit while sign-in is pending", async () => {
    let resolveSignIn: () => void = () => {}
    mockSignIn.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveSignIn = resolve
        })
    )
    render(<AuthScreen />)

    fillCredentials()
    clickSubmitButton("Sign in")

    const pendingButton = await screen.findByRole("button", {
      name: "Working...",
    })
    expect((pendingButton as HTMLButtonElement).disabled).toBe(true)

    fireEvent.click(pendingButton)
    expect(mockSignIn).toHaveBeenCalledTimes(1)

    resolveSignIn()
    await waitFor(() =>
      expect((pendingButton as HTMLButtonElement).disabled).toBe(false)
    )
  })
})
