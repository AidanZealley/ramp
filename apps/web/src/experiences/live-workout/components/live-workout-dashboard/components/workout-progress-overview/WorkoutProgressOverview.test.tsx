import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WorkoutProgressOverview } from "./WorkoutProgressOverview"

const intervals = [
  { startPower: 100, endPower: 100, durationSeconds: 30 },
  { startPower: 120, endPower: 120, durationSeconds: 30 },
  { startPower: 80, endPower: 80, durationSeconds: 30 },
]

beforeEach(() => {
  HTMLElement.prototype.setPointerCapture = vi.fn()
  HTMLElement.prototype.releasePointerCapture = vi.fn()
  HTMLElement.prototype.hasPointerCapture = vi.fn(() => true)
})

describe("WorkoutProgressOverview", () => {
  it("renders playback controls in the overview", () => {
    render(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={10}
        totalDurationSeconds={90}
        activeSegmentIndex={0}
        completedIntervalCount={0}
        paused={false}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={vi.fn()}
      />
    )

    expect(screen.getByLabelText("Workout overview")).toBeTruthy()
    expect(screen.getByLabelText("Skip to previous interval")).toBeTruthy()
    expect(screen.getByLabelText("Pause workout")).toBeTruthy()
    expect(screen.getByLabelText("Skip to next interval")).toBeTruthy()
    expect(screen.getByLabelText("End workout")).toBeTruthy()
    expect(screen.getByTestId("workout-mini-ftp-line")).toBeTruthy()
    expect(screen.getByText("FTP 200W")).toBeTruthy()
  })

  it("skips backward to the current interval start unless near the start", () => {
    const onSeek = vi.fn()
    const { rerender } = render(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={45}
        totalDurationSeconds={90}
        activeSegmentIndex={1}
        completedIntervalCount={1}
        paused={false}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={onSeek}
      />
    )

    fireEvent.click(screen.getByLabelText("Skip to previous interval"))
    expect(onSeek).toHaveBeenLastCalledWith(30)

    rerender(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={32}
        totalDurationSeconds={90}
        activeSegmentIndex={1}
        completedIntervalCount={1}
        paused={false}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={onSeek}
      />
    )

    fireEvent.click(screen.getByLabelText("Skip to previous interval"))
    expect(onSeek).toHaveBeenLastCalledWith(0)
  })

  it("skips forward to the next interval start", () => {
    const onSeek = vi.fn()
    render(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={10}
        totalDurationSeconds={90}
        activeSegmentIndex={0}
        completedIntervalCount={0}
        paused={false}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={onSeek}
      />
    )

    fireEvent.click(screen.getByLabelText("Skip to next interval"))

    expect(onSeek).toHaveBeenCalledWith(30)
  })

  it("previews drag position and seeks only on release", () => {
    const onSeek = vi.fn()
    render(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={0}
        totalDurationSeconds={90}
        activeSegmentIndex={0}
        completedIntervalCount={0}
        paused={false}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={onSeek}
      />
    )
    const timeline = screen.getByTestId("workout-progress-timeline")
    vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 100,
      width: 300,
      height: 100,
      toJSON: () => ({}),
    })

    fireEvent.pointerDown(timeline, { pointerId: 1, clientX: 30 })
    fireEvent.pointerMove(timeline, { pointerId: 1, clientX: 150 })

    expect(onSeek).not.toHaveBeenCalled()
    expect(screen.getByTestId("workout-progress-line").style.left).toBe(
      "50%"
    )

    fireEvent.pointerUp(timeline, { pointerId: 1, clientX: 150 })

    expect(onSeek).toHaveBeenCalledWith(45)
  })

  it("aligns progress with divider-spaced interval boundaries", () => {
    render(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={30}
        totalDurationSeconds={90}
        activeSegmentIndex={1}
        completedIntervalCount={1}
        paused={false}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={vi.fn()}
      />
    )

    expect(screen.getByTestId("workout-progress-line").style.left).toBe(
      "33.25%"
    )
  })

  it("seeks from divider-spaced timeline coordinates", () => {
    const onSeek = vi.fn()
    render(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={0}
        totalDurationSeconds={90}
        activeSegmentIndex={0}
        completedIntervalCount={0}
        paused={false}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={onSeek}
      />
    )
    const timeline = screen.getByTestId("workout-progress-timeline")
    vi.spyOn(timeline, "getBoundingClientRect").mockReturnValue({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 300,
      bottom: 100,
      width: 300,
      height: 100,
      toJSON: () => ({}),
    })

    fireEvent.pointerDown(timeline, { pointerId: 1, clientX: 99.75 })
    fireEvent.pointerUp(timeline, { pointerId: 1, clientX: 99.75 })

    expect(onSeek).toHaveBeenCalledWith(30)
  })

  it("shows a paused overlay over the remaining workout", () => {
    render(
      <WorkoutProgressOverview
        intervals={intervals}
        ftp={200}
        elapsedSeconds={30}
        totalDurationSeconds={90}
        activeSegmentIndex={1}
        completedIntervalCount={1}
        paused={true}
        isComplete={false}
        onPause={vi.fn()}
        onResume={vi.fn()}
        onStop={vi.fn()}
        onSeek={vi.fn()}
      />
    )

    expect(screen.getByText("Workout paused")).toBeTruthy()
    expect(screen.getByLabelText("Start workout")).toBeTruthy()
  })
})
