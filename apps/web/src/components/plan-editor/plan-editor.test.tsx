import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMutation, useQuery } from "convex/react"
import { PlanEditor } from "./plan-editor"
import type { Id } from "#convex/_generated/dataModel"
import type { PlanEditorPlan, PlanEditorWeek } from "./types"

const navigateMock = vi.fn()
const assignDayWorkoutMock = vi.fn()

vi.mock("convex/react", () => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(),
}))

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}))

vi.mock("@/components/editable-title", () => ({
  EditableTitle: ({ value }: { value: string }) => <h1>{value}</h1>,
}))

vi.mock("@/components/plan-editor-skeleton", () => ({
  PlanEditorSkeleton: () => <div>Loading plan</div>,
}))

vi.mock("./components/plan-actions-menu", () => ({
  PlanActionsMenu: () => <button type="button">Plan actions</button>,
}))

vi.mock("./components/workout-drawer", () => ({
  WorkoutDrawer: ({
    activeDayIndex,
    mode,
    onAssign,
    open,
  }: {
    activeDayIndex: number
    mode?: "add" | "swap"
    onAssign: (workoutId: Id<"workouts">) => void
    open: boolean
  }) =>
    open ? (
      <div role="dialog">
        <div>
          {mode === "swap" ? "Swap" : "Add"} drawer day {activeDayIndex}
        </div>
        <button
          type="button"
          onClick={() => onAssign("workout-new" as Id<"workouts">)}
        >
          Assign mocked workout
        </button>
      </div>
    ) : null,
}))

const workoutA = {
  _id: "workout-a" as Id<"workouts">,
  _creationTime: 1,
  ownerId: "user-1" as Id<"users">,
  title: "Red Unicorn",
  intervals: [{ startPower: 80, endPower: 100, durationSeconds: 600 }],
}

const workoutB = {
  _id: "workout-b" as Id<"workouts">,
  _creationTime: 2,
  ownerId: "user-1" as Id<"users">,
  title: "Blue Tempo",
  intervals: [{ startPower: 70, endPower: 75, durationSeconds: 300 }],
}

function slot(
  weekId: Id<"planWeeks">,
  dayIndex: number,
  workout: typeof workoutA | typeof workoutB | null
): PlanEditorWeek["slots"][number] {
  return {
    _id: `${weekId}-slot-${dayIndex}` as Id<"planWeekWorkouts">,
    _creationTime: 1,
    weekId,
    dayIndex,
    workoutId: workout?._id ?? null,
    workout,
  }
}

function makeWeek(
  id: string,
  slots: PlanEditorWeek["slots"],
  weekIndex = 0
): PlanEditorWeek {
  return {
    _id: id as Id<"planWeeks">,
    _creationTime: 1,
    planId: "plan-1" as Id<"plans">,
    orderIndex: weekIndex,
    slots,
  }
}

function makePlan(weeks: Array<PlanEditorWeek>): PlanEditorPlan {
  return {
    _id: "plan-1" as Id<"plans">,
    _creationTime: 1,
    ownerId: "user-1" as Id<"users">,
    title: "Race Build",
    weeks,
  }
}

describe("PlanEditor", () => {
  let plan: PlanEditorPlan

  beforeEach(() => {
    navigateMock.mockReset()
    assignDayWorkoutMock.mockReset()
    assignDayWorkoutMock.mockResolvedValue(undefined)
    ;(useQuery as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => plan
    )
    ;(useMutation as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      () => ({
        withOptimisticUpdate: () => assignDayWorkoutMock,
      })
    )
  })

  it("selects the first assigned workout day on initial render", async () => {
    const weekId = "week-1" as Id<"planWeeks">
    plan = makePlan([makeWeek(weekId, [slot(weekId, 3, workoutA)])])

    render(<PlanEditor planId={"plan-1" as Id<"plans">} />)

    expect(await screen.findByText("Thursday")).toBeTruthy()
    expect(screen.getByRole("heading", { name: "Red Unicorn" })).toBeTruthy()
    expect(
      screen.getByRole("button", {
        name: "Select Thursday, Red Unicorn assigned",
      }).getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("selects Monday and shows the empty prompt when the week has no workouts", async () => {
    plan = makePlan([makeWeek("week-1", [])])

    render(<PlanEditor planId={"plan-1" as Id<"plans">} />)

    expect(await screen.findByText("Monday")).toBeTruthy()
    expect(screen.getByText("No workout assigned")).toBeTruthy()
    expect(
      screen.getByRole("button", {
        name: "Select Monday, no workout assigned",
      }).getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("clicking a day selects the preview without opening the drawer", async () => {
    const weekId = "week-1" as Id<"planWeeks">
    plan = makePlan([
      makeWeek(weekId, [slot(weekId, 1, workoutA), slot(weekId, 4, workoutB)]),
    ])

    render(<PlanEditor planId={"plan-1" as Id<"plans">} />)

    fireEvent.click(
      await screen.findByRole("button", {
        name: "Select Friday, Blue Tempo assigned",
      })
    )

    expect(screen.getByRole("heading", { name: "Blue Tempo" })).toBeTruthy()
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("opens the drawer from Add workout or Swap workout actions", async () => {
    plan = makePlan([makeWeek("week-1", [])])
    const { rerender } = render(
      <PlanEditor planId={"plan-1" as Id<"plans">} />
    )

    fireEvent.click(await screen.findByRole("button", { name: "Add workout" }))
    expect(screen.getByRole("dialog").textContent).toContain("Add drawer day 0")

    const weekId = "week-2" as Id<"planWeeks">
    plan = makePlan([makeWeek(weekId, [slot(weekId, 2, workoutA)])])
    rerender(<PlanEditor planId={"plan-1" as Id<"plans">} />)

    fireEvent.click(await screen.findByRole("button", { name: "Swap workout" }))
    expect(screen.getByRole("dialog").textContent).toContain("Swap drawer day 2")
  })

  it("assigning closes the drawer and keeps the selected day", async () => {
    plan = makePlan([makeWeek("week-1", [])])

    render(<PlanEditor planId={"plan-1" as Id<"plans">} />)

    fireEvent.click(await screen.findByRole("button", { name: "Add workout" }))
    fireEvent.click(screen.getByRole("button", { name: "Assign mocked workout" }))

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull())
    expect(assignDayWorkoutMock).toHaveBeenCalledWith({
      weekId: "week-1",
      dayIndex: 0,
      workoutId: "workout-new",
    })
    expect(
      screen.getByRole("button", {
        name: "Select Monday, no workout assigned",
      }).getAttribute("aria-pressed")
    ).toBe("true")
  })

  it("removing a workout clears that day without changing selection", async () => {
    const weekId = "week-1" as Id<"planWeeks">
    plan = makePlan([makeWeek(weekId, [slot(weekId, 3, workoutA)])])

    render(<PlanEditor planId={"plan-1" as Id<"plans">} />)

    fireEvent.click(await screen.findByRole("button", { name: "Remove from day" }))

    expect(assignDayWorkoutMock).toHaveBeenCalledWith({
      weekId,
      dayIndex: 3,
      workoutId: null,
    })
    expect(
      screen.getByRole("button", {
        name: "Select Thursday, Red Unicorn assigned",
      }).getAttribute("aria-pressed")
    ).toBe("true")
  })
})
