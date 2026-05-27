import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { WorkoutMini } from "./WorkoutMini"
import { getZoneColor } from "@/lib/zones"

const intervals = [
  { startPower: 100, endPower: 100, durationSeconds: 30 },
  { startPower: 120, endPower: 120, durationSeconds: 30 },
  { startPower: 80, endPower: 80, durationSeconds: 30 },
]

const getSegmentXs = (index: number) => {
  const points =
    screen.getByTestId(`workout-mini-segment-${index}`).getAttribute("points") ??
    ""
  const [startPoint, endPoint] = points.split(" ")

  return {
    startX: Number(startPoint?.split(",")[0]),
    endX: Number(endPoint?.split(",")[0]),
  }
}

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

  it("scales segment heights without rescaling the chart domain", () => {
    render(<WorkoutMini intervals={intervals} powerScalePercent={110} />)

    const firstSegmentPoints = screen
      .getByTestId("workout-mini-segment-0")
      .getAttribute("points")
    const firstPointY = Number(firstSegmentPoints?.split(" ")[0]?.split(",")[1])

    expect(firstPointY).toBeCloseTo(20.29, 2)
  })

  it("expands the chart domain when difficulty would overflow the top", () => {
    render(<WorkoutMini intervals={intervals} powerScalePercent={150} />)

    const segmentYs = intervals.flatMap((_, index) => {
      const points =
        screen
          .getByTestId(`workout-mini-segment-${index}`)
          .getAttribute("points") ?? ""

      return points
        .split(" ")
        .slice(0, 2)
        .map((point) => Number(point.split(",")[1]))
    })

    expect(Math.min(...segmentYs)).toBeGreaterThanOrEqual(0)
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

  it("creates transparent gaps in segment geometry by default", () => {
    const { container } = render(<WorkoutMini intervals={intervals} />)

    const first = getSegmentXs(0)
    const second = getSegmentXs(1)
    const third = getSegmentXs(2)

    expect(first.startX).toBe(0)
    expect(first.endX).toBeCloseTo(66.3333, 4)
    expect(second.startX).toBeCloseTo(66.8333, 4)
    expect(second.endX).toBeCloseTo(133.1667, 4)
    expect(third.startX).toBeCloseTo(133.6667, 4)

    expect(container.querySelector("mask")).toBeNull()
    expect(container.querySelector("line")).toBeNull()
  })

  it("keeps contiguous segment geometry when dividers are hidden", () => {
    render(<WorkoutMini intervals={intervals} showDividers={false} />)

    const first = getSegmentXs(0)
    const second = getSegmentXs(1)

    expect(first.startX).toBe(0)
    expect(first.endX).toBeCloseTo(66.6667, 4)
    expect(second.startX).toBeCloseTo(first.endX, 4)
  })

  it("does not subtract divider width from thin intervals", () => {
    const { container } = render(
      <WorkoutMini
        intervals={[
          { durationSeconds: 600, startPower: 100, endPower: 100 },
          { durationSeconds: 5, startPower: 300, endPower: 300 },
          { durationSeconds: 600, startPower: 100, endPower: 100 },
        ]}
      />
    )

    const thinInterval = getSegmentXs(1)

    expect(thinInterval.endX - thinInterval.startX).toBeCloseTo(
      (5 / 1205) * 199,
      4
    )

    expect(container.querySelector("mask")).toBeNull()
  })

  it("caps total gap space for crowded interval layouts", () => {
    const crowdedIntervals = Array.from({ length: 101 }, () => ({
      startPower: 100,
      endPower: 100,
      durationSeconds: 1,
    }))

    render(<WorkoutMini intervals={crowdedIntervals} />)

    const first = getSegmentXs(0)
    const second = getSegmentXs(1)
    const last = getSegmentXs(100)

    expect(second.startX - first.endX).toBeCloseTo(0.5, 4)
    expect(first.endX - first.startX).toBeCloseTo(150 / 101, 4)
    expect(last.endX).toBeCloseTo(200, 4)
  })
})
