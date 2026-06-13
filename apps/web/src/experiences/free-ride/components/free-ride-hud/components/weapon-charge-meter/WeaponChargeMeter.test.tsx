import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FREE_RIDE_TARGETS } from "../../../../free-ride-config"
import { WeaponChargeMeter } from "./WeaponChargeMeter"

describe("WeaponChargeMeter", () => {
  it("renders the weapon charge label", () => {
    render(
      <WeaponChargeMeter
        charge={0.8}
        percent={80}
        active={true}
        color={FREE_RIDE_TARGETS.weaponChargeHudColor}
        segmentCount={12}
      />
    )

    expect(screen.getByText("WEAPON CHARGE")).toBeTruthy()
  })

  it("renders the weapon charge percentage", () => {
    render(
      <WeaponChargeMeter
        charge={0.8}
        percent={80}
        active={true}
        color={FREE_RIDE_TARGETS.weaponChargeHudColor}
        segmentCount={12}
      />
    )

    expect(screen.getByText("80%")).toBeTruthy()
  })

  it("renders filled and empty segments from charge", () => {
    render(
      <WeaponChargeMeter
        charge={0.8}
        percent={80}
        active={true}
        color={FREE_RIDE_TARGETS.weaponChargeHudColor}
        segmentCount={12}
      />
    )

    expect(screen.getAllByTestId("weapon-charge-segment-filled")).toHaveLength(
      10
    )
    expect(screen.getAllByTestId("weapon-charge-segment-empty")).toHaveLength(2)
  })

  it("renders active and inactive states without throwing", () => {
    expect(() =>
      render(
        <WeaponChargeMeter
          charge={0.4}
          percent={40}
          active={true}
          color={FREE_RIDE_TARGETS.weaponChargeHudColor}
          segmentCount={12}
        />
      )
    ).not.toThrow()

    expect(() =>
      render(
        <WeaponChargeMeter
          charge={0.4}
          percent={40}
          active={false}
          color={FREE_RIDE_TARGETS.weaponChargeHudColor}
          segmentCount={12}
        />
      )
    ).not.toThrow()
  })
})
