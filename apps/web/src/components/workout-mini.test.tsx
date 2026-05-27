import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WorkoutMini } from "./workout-mini"
import { getZoneColor } from "@/lib/zones"

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

  it("renders ramp intervals with a zone gradient", () => {
    const { container } = render(
      <WorkoutMini
        intervals={[{ startPower: 50, endPower: 125, durationSeconds: 60 }]}
      />
    )

    const segment = screen.getByTestId("workout-mini-segment-0")
    const fill = segment.getAttribute("fill")
    expect(fill).toMatch(/^url\(#.+-segment-0\)$/)

    const gradientId = fill?.replace(/^url\(#(.+)\)$/, "$1")
    const gradient = container.querySelector(`[id="${gradientId}"]`)
    const stops = Array.from(gradient?.querySelectorAll("stop") ?? [])

    expect(stops.map((stop) => stop.getAttribute("stop-color"))).toEqual([
      getZoneColor(50),
      getZoneColor(60),
      getZoneColor(76),
      getZoneColor(90),
      getZoneColor(105),
      getZoneColor(119),
      getZoneColor(125),
    ])
  })
})
