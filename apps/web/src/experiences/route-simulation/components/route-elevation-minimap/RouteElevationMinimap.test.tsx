import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RouteElevationMinimap } from "./RouteElevationMinimap"

describe("RouteElevationMinimap", () => {
  it("shows the current rider elevation", () => {
    render(
      <RouteElevationMinimap
        distanceMeters={500}
        riderElevationMeters={123.4}
        samples={[
          { distanceMeters: 0, elevationMeters: 100 },
          { distanceMeters: 1000, elevationMeters: 200 },
        ]}
        totalDistanceMeters={1000}
      />
    )

    expect(screen.getByText("Elevation")).toBeTruthy()
    expect(screen.getByText("123 m")).toBeTruthy()
  })

  it("falls back when rider elevation is unavailable", () => {
    render(
      <RouteElevationMinimap
        distanceMeters={500}
        riderElevationMeters={null}
        samples={[
          { distanceMeters: 0, elevationMeters: 100 },
          { distanceMeters: 1000, elevationMeters: 200 },
        ]}
        totalDistanceMeters={1000}
      />
    )

    expect(screen.getByText("--")).toBeTruthy()
  })
})
