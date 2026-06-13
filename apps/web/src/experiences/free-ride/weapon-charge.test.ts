import { describe, expect, it } from "vitest"
import {
  getNextWeaponCharge,
  getWeaponChargeActive,
} from "./weapon-charge"

describe("getWeaponChargeActive", () => {
  it("returns false when draft is unlocked even above threshold", () => {
    expect(
      getWeaponChargeActive({
        draftLocked: false,
        riderPowerWatts: 300,
        riderFtpWatts: 250,
      })
    ).toBe(false)
  })

  it("returns false when power is null", () => {
    expect(
      getWeaponChargeActive({
        draftLocked: true,
        riderPowerWatts: null,
        riderFtpWatts: 250,
      })
    ).toBe(false)
  })

  it("returns false for invalid power values", () => {
    for (const riderPowerWatts of [Number.NaN, Infinity, -Infinity]) {
      expect(
        getWeaponChargeActive({
          draftLocked: true,
          riderPowerWatts,
          riderFtpWatts: 250,
        })
      ).toBe(false)
    }
  })

  it("returns false for invalid or non-positive FTP", () => {
    for (const riderFtpWatts of [Number.NaN, Infinity, -Infinity, 0, -250]) {
      expect(
        getWeaponChargeActive({
          draftLocked: true,
          riderPowerWatts: 300,
          riderFtpWatts,
        })
      ).toBe(false)
    }
  })

  it("returns false just below 0.95 * FTP", () => {
    expect(
      getWeaponChargeActive({
        draftLocked: true,
        riderPowerWatts: 237.49,
        riderFtpWatts: 250,
      })
    ).toBe(false)
  })

  it("returns true exactly at 0.95 * FTP", () => {
    expect(
      getWeaponChargeActive({
        draftLocked: true,
        riderPowerWatts: 237.5,
        riderFtpWatts: 250,
      })
    ).toBe(true)
  })

  it("returns true above 0.95 * FTP", () => {
    expect(
      getWeaponChargeActive({
        draftLocked: true,
        riderPowerWatts: 260,
        riderFtpWatts: 250,
      })
    ).toBe(true)
  })
})

describe("getNextWeaponCharge", () => {
  it("holds charge when inactive", () => {
    expect(
      getNextWeaponCharge({
        currentCharge: 0.4,
        chargeActive: false,
        deltaSeconds: 1,
      })
    ).toBe(0.4)
  })

  it("increases by deltaSeconds / 10 when active", () => {
    expect(
      getNextWeaponCharge({
        currentCharge: 0.4,
        chargeActive: true,
        deltaSeconds: 2,
      })
    ).toBeCloseTo(0.6)
  })

  it("clamps to 1", () => {
    expect(
      getNextWeaponCharge({
        currentCharge: 0.95,
        chargeActive: true,
        deltaSeconds: 2,
      })
    ).toBe(1)
  })

  it("clamps invalid current charge to [0, 1] behavior starting from 0", () => {
    expect(
      getNextWeaponCharge({
        currentCharge: Number.NaN,
        chargeActive: true,
        deltaSeconds: 1,
      })
    ).toBeCloseTo(0.1)
  })

  it("ignores invalid, zero, or negative delta", () => {
    for (const deltaSeconds of [Number.NaN, Infinity, -Infinity, 0, -1]) {
      expect(
        getNextWeaponCharge({
          currentCharge: 0.4,
          chargeActive: true,
          deltaSeconds,
        })
      ).toBe(0.4)
    }
  })

  it("always returns a finite value in [0, 1] for representative inputs", () => {
    for (const currentCharge of [
      Number.NaN,
      -1,
      0,
      0.4,
      1,
      2,
      Infinity,
    ]) {
      for (const deltaSeconds of [-1, 0, 0.016, 1, 12, Infinity]) {
        const charge = getNextWeaponCharge({
          currentCharge,
          chargeActive: true,
          deltaSeconds,
        })
        expect(Number.isFinite(charge)).toBe(true)
        expect(charge).toBeGreaterThanOrEqual(0)
        expect(charge).toBeLessThanOrEqual(1)
      }
    }
  })
})
