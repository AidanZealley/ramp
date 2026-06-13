import { describe, expect, it } from "vitest"
import {
  getNextCountdownSeconds,
  getWeaponFireProgress,
  getWeaponFireTriggered,
} from "./weapon-kill"

describe("getWeaponFireTriggered", () => {
  it("returns false below full charge", () => {
    expect(
      getWeaponFireTriggered({
        weaponCharge: 0.99,
        targetDroneAlive: true,
        weaponFiring: false,
        respawnSecondsRemaining: 0,
      })
    ).toBe(false)
  })

  it("returns true exactly at full charge when ready", () => {
    expect(
      getWeaponFireTriggered({
        weaponCharge: 1,
        targetDroneAlive: true,
        weaponFiring: false,
        respawnSecondsRemaining: 0,
      })
    ).toBe(true)
  })

  it("returns true above full charge when ready", () => {
    expect(
      getWeaponFireTriggered({
        weaponCharge: 1.2,
        targetDroneAlive: true,
        weaponFiring: false,
        respawnSecondsRemaining: 0,
      })
    ).toBe(true)
  })

  it("returns false when target is dead", () => {
    expect(
      getWeaponFireTriggered({
        weaponCharge: 1,
        targetDroneAlive: false,
        weaponFiring: false,
        respawnSecondsRemaining: 0,
      })
    ).toBe(false)
  })

  it("returns false when already firing", () => {
    expect(
      getWeaponFireTriggered({
        weaponCharge: 1,
        targetDroneAlive: true,
        weaponFiring: true,
        respawnSecondsRemaining: 0,
      })
    ).toBe(false)
  })

  it("returns false when respawn timer is positive", () => {
    expect(
      getWeaponFireTriggered({
        weaponCharge: 1,
        targetDroneAlive: true,
        weaponFiring: false,
        respawnSecondsRemaining: 0.1,
      })
    ).toBe(false)
  })

  it("returns false for invalid charge", () => {
    for (const weaponCharge of [Number.NaN, Infinity, -Infinity]) {
      expect(
        getWeaponFireTriggered({
          weaponCharge,
          targetDroneAlive: true,
          weaponFiring: false,
          respawnSecondsRemaining: 0,
        })
      ).toBe(false)
    }
  })

  it("returns false for invalid respawn timer", () => {
    for (const respawnSecondsRemaining of [
      Number.NaN,
      Infinity,
      -Infinity,
    ]) {
      expect(
        getWeaponFireTriggered({
          weaponCharge: 1,
          targetDroneAlive: true,
          weaponFiring: false,
          respawnSecondsRemaining,
        })
      ).toBe(false)
    }
  })

  it("does not throw for representative inputs", () => {
    for (const weaponCharge of [Number.NaN, 0, 0.5, 1, 2]) {
      for (const targetDroneAlive of [true, false]) {
        for (const weaponFiring of [true, false]) {
          for (const respawnSecondsRemaining of [Number.NaN, 0, 0.5]) {
            expect(() =>
              getWeaponFireTriggered({
                weaponCharge,
                targetDroneAlive,
                weaponFiring,
                respawnSecondsRemaining,
              })
            ).not.toThrow()
          }
        }
      }
    }
  })
})

describe("getNextCountdownSeconds", () => {
  it("decrements positive timer by delta", () => {
    expect(
      getNextCountdownSeconds({ currentSeconds: 1.2, deltaSeconds: 0.2 })
    ).toBeCloseTo(1)
  })

  it("clamps at 0", () => {
    expect(
      getNextCountdownSeconds({ currentSeconds: 0.2, deltaSeconds: 1 })
    ).toBe(0)
  })

  it("returns 0 for invalid current timer", () => {
    for (const currentSeconds of [Number.NaN, Infinity, -Infinity]) {
      expect(
        getNextCountdownSeconds({ currentSeconds, deltaSeconds: 0.1 })
      ).toBe(0)
    }
  })

  it("ignores invalid, zero, or negative delta", () => {
    for (const deltaSeconds of [Number.NaN, Infinity, -Infinity, 0, -1]) {
      expect(
        getNextCountdownSeconds({ currentSeconds: 1.2, deltaSeconds })
      ).toBe(1.2)
    }
  })

  it("always returns finite non-negative values", () => {
    for (const currentSeconds of [Number.NaN, -1, 0, 0.5, 2, Infinity]) {
      for (const deltaSeconds of [Number.NaN, -1, 0, 0.016, 1, Infinity]) {
        const next = getNextCountdownSeconds({
          currentSeconds,
          deltaSeconds,
        })
        expect(Number.isFinite(next)).toBe(true)
        expect(next).toBeGreaterThanOrEqual(0)
      }
    }
  })
})

describe("getWeaponFireProgress", () => {
  it("returns 0 at full remaining time", () => {
    expect(
      getWeaponFireProgress({
        fireSecondsRemaining: 0.35,
        fireSecondsTotal: 0.35,
      })
    ).toBe(0)
  })

  it("returns 0.5 halfway", () => {
    expect(
      getWeaponFireProgress({
        fireSecondsRemaining: 0.175,
        fireSecondsTotal: 0.35,
      })
    ).toBe(0.5)
  })

  it("returns 1 at zero remaining", () => {
    expect(
      getWeaponFireProgress({
        fireSecondsRemaining: 0,
        fireSecondsTotal: 0.35,
      })
    ).toBe(1)
  })

  it("clamps below 0 and above 1", () => {
    expect(
      getWeaponFireProgress({
        fireSecondsRemaining: 0.7,
        fireSecondsTotal: 0.35,
      })
    ).toBe(0)
    expect(
      getWeaponFireProgress({
        fireSecondsRemaining: -0.1,
        fireSecondsTotal: 0.35,
      })
    ).toBe(1)
  })

  it("returns 1 for invalid or non-positive total", () => {
    for (const fireSecondsTotal of [Number.NaN, Infinity, -Infinity, 0, -1]) {
      expect(
        getWeaponFireProgress({
          fireSecondsRemaining: 0.35,
          fireSecondsTotal,
        })
      ).toBe(1)
    }
  })
})
