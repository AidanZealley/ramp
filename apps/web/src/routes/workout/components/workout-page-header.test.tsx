import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMutation } from "convex/react"
import { WorkoutPageHeader } from "./workout-page-header"
import type { Id } from "#convex/_generated/dataModel"
import type React from "react"

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    params,
    search,
    to,
    ...props
  }: {
    children: React.ReactNode
    params?: Record<string, string>
    search?: Record<string, string>
    to: string
  }) => {
    const pathname = params
      ? Object.entries(params).reduce(
          (path, [key, value]) => path.replace(`$${key}`, value),
          to
        )
      : to
    const query = search
      ? `?${new URLSearchParams(search).toString()}`
      : ""
    return (
      <a href={`${pathname}${query}`} {...props}>
        {children}
      </a>
    )
  },
}))

vi.mock("@/components/editable-title", () => ({
  EditableTitle: ({
    value,
    onChange,
  }: {
    value: string
    onChange: (value: string) => void
  }) => (
    <button onClick={() => onChange("Updated Workout")} type="button">
      {value}
    </button>
  ),
}))

describe("WorkoutPageHeader", () => {
  const workoutId = "workout-1" as Id<"workouts">
  let updateTitleMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    updateTitleMock = vi.fn().mockResolvedValue(undefined)
    ;(useMutation as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      updateTitleMock
    )
  })

  it("updates the workout title directly from the header", () => {
    render(
      <WorkoutPageHeader
        workoutId={workoutId}
        title="Threshold Builder"
        onBack={vi.fn()}
        onDuplicate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Threshold Builder" }))

    expect(updateTitleMock).toHaveBeenCalledWith({
      id: workoutId,
      title: "Updated Workout",
    })
  })

  it("links to live workout with the workout preselected", () => {
    render(
      <WorkoutPageHeader
        workoutId={workoutId}
        title="Threshold Builder"
        onBack={vi.fn()}
        onDuplicate={vi.fn().mockResolvedValue(undefined)}
        onDelete={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(
      screen.getByRole("link", { name: "Ride workout" }).getAttribute("href")
    ).toBe("/ride/live-workout?workoutId=workout-1")
  })
})
