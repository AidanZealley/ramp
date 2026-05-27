import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { RouteCompleteDialog } from "./RouteCompleteDialog"

describe("RouteCompleteDialog", () => {
  it("exposes restart as a dedicated action", () => {
    const onOpenChange = vi.fn()
    const onRestart = vi.fn()

    render(
      <RouteCompleteDialog
        distanceMeters={5000}
        elapsedSeconds={900}
        onOpenChange={onOpenChange}
        onRestart={onRestart}
        open={true}
        routeTitle="Test route"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Restart" }))

    expect(onRestart).toHaveBeenCalledTimes(1)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("keeps done as a close-only action", () => {
    const onOpenChange = vi.fn()
    const onRestart = vi.fn()

    render(
      <RouteCompleteDialog
        distanceMeters={5000}
        elapsedSeconds={900}
        onOpenChange={onOpenChange}
        onRestart={onRestart}
        open={true}
        routeTitle="Test route"
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Done" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(onRestart).not.toHaveBeenCalled()
  })
})
