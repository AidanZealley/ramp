import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FREE_RIDE_TARGETS } from "../../../../free-ride-config"
import { DraftQualityMeter } from "./DraftQualityMeter"

describe("DraftQualityMeter", () => {
  it("renders the draft quality label", () => {
    render(
      <DraftQualityMeter
        quality={0.8}
        percent={80}
        color={FREE_RIDE_TARGETS.draftHudColor}
        segmentCount={10}
      />
    )

    expect(screen.getByText("Draft Quality")).toBeTruthy()
  })

  it("renders the draft quality percentage", () => {
    render(
      <DraftQualityMeter
        quality={0.8}
        percent={80}
        color={FREE_RIDE_TARGETS.draftHudColor}
        segmentCount={10}
      />
    )

    expect(screen.getByText("80%")).toBeTruthy()
  })

  it("renders filled and empty segments from quality", () => {
    render(
      <DraftQualityMeter
        quality={0.8}
        percent={80}
        color={FREE_RIDE_TARGETS.draftHudColor}
        segmentCount={10}
      />
    )

    expect(screen.getAllByTestId("draft-quality-segment-filled")).toHaveLength(
      8
    )
    expect(screen.getAllByTestId("draft-quality-segment-empty")).toHaveLength(
      2
    )
  })
})
