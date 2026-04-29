import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMutation } from "convex/react"
import { WorkoutPageHeader } from "./workout-page-header"
import type { Id } from "../../../../convex/_generated/dataModel"

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
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
})
