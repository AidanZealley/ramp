import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WorkoutMini } from "./workout-mini"

const intervals = [
  { startPower: 100, endPower: 100, durationSeconds: 30 },
  { startPower: 120, endPower: 120, durationSeconds: 30 },
  { startPower: 80, endPower: 80, durationSeconds: 30 },
]

describe("WorkoutMini", () => {
  it("renders default segments at full opacity", () => {
    render(<WorkoutMini intervals={intervals} />)

    expect(
      screen.getByTestId("workout-mini-segment-0").getAttribute("fill-opacity")
    ).toBe("1")
    expect(
      screen.getByTestId("workout-mini-segment-1").getAttribute("fill-opacity")
    ).toBe("1")
  })

  it("dims non-highlighted segments when a highlight is present", () => {
    render(<WorkoutMini intervals={intervals} highlightedIntervalIndex={1} />)

    expect(
      screen.getByTestId("workout-mini-segment-0").getAttribute("fill-opacity")
    ).toBe("0.9")
    expect(
      screen.getByTestId("workout-mini-segment-1").getAttribute("fill-opacity")
    ).toBe("1")
  })

  it("reduces completed segment opacity", () => {
    render(<WorkoutMini intervals={intervals} reducedIntervalIndexes={[0]} />)

    expect(
      screen.getByTestId("workout-mini-segment-0").getAttribute("fill-opacity")
    ).toBe("0.35")
    expect(
      screen.getByTestId("workout-mini-segment-1").getAttribute("fill-opacity")
    ).toBe("1")
  })

  it("lets highlighted opacity win over reduced opacity", () => {
    render(
      <WorkoutMini
        intervals={intervals}
        highlightedIntervalIndex={0}
        reducedIntervalIndexes={[0, 1]}
      />
    )

    expect(
      screen.getByTestId("workout-mini-segment-0").getAttribute("fill-opacity")
    ).toBe("1")
    expect(
      screen.getByTestId("workout-mini-segment-1").getAttribute("fill-opacity")
    ).toBe("0.35")
    expect(
      screen.getByTestId("workout-mini-segment-2").getAttribute("fill-opacity")
    ).toBe("0.9")
  })
})
