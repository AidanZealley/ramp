import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { RouteMini } from "./RouteMini"

describe("RouteMini", () => {
  it("renders preview points in an equal-scale square viewBox", () => {
    render(
      <RouteMini
        previewPoints={[
          { x: 0, y: 0 },
          { x: 0.5, y: 0.25 },
          { x: 1, y: 0.5 },
        ]}
      />
    )

    const svg = screen.getByLabelText("Route preview")
    const path = svg.querySelector("path")

    expect(svg.getAttribute("viewBox")).toBe("0 0 100 100")
    expect(path?.getAttribute("d")).toBe(
      "M 8.00 8.00 L 50.00 29.00 L 92.00 50.00"
    )
  })
})
