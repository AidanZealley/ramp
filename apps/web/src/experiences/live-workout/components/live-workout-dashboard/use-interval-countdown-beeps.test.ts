import { renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useIntervalCountdownBeeps } from "./use-interval-countdown-beeps"

const oscillatorStart = vi.fn()
const oscillatorStop = vi.fn()
const frequencySetValueAtTime = vi.fn()
const gainSetValueAtTime = vi.fn()
const gainRampToValueAtTime = vi.fn()
const resume = vi.fn(() => Promise.resolve())

function installAudioContextMock() {
  const AudioContextMock = vi.fn().mockImplementation(() => ({
    currentTime: 10,
    destination: {},
    state: "running",
    resume,
    createOscillator: vi.fn(() => ({
      type: "sine",
      frequency: {
        setValueAtTime: frequencySetValueAtTime,
      },
      connect: vi.fn(),
      start: oscillatorStart,
      stop: oscillatorStop,
    })),
    createGain: vi.fn(() => ({
      gain: {
        setValueAtTime: gainSetValueAtTime,
        exponentialRampToValueAtTime: gainRampToValueAtTime,
      },
      connect: vi.fn(),
    })),
  }))

  Object.defineProperty(window, "AudioContext", {
    configurable: true,
    value: AudioContextMock,
  })
}

describe("useIntervalCountdownBeeps", () => {
  beforeEach(() => {
    oscillatorStart.mockClear()
    oscillatorStop.mockClear()
    frequencySetValueAtTime.mockClear()
    gainSetValueAtTime.mockClear()
    gainRampToValueAtTime.mockClear()
    resume.mockClear()
    installAudioContextMock()
  })

  it("plays one short beep for each displayed final countdown second", () => {
    const { rerender } = renderHook(
      (intervalRemainingSeconds: number) =>
        useIntervalCountdownBeeps({
          activeSegmentIndex: 0,
          intervalRemainingSeconds,
          isActive: true,
          isComplete: false,
          paused: false,
        }),
      { initialProps: 60 }
    )

    rerender(5)
    rerender(4)
    rerender(3)
    rerender(2)
    rerender(1)

    expect(frequencySetValueAtTime).toHaveBeenCalledTimes(5)
    expect(frequencySetValueAtTime).toHaveBeenCalledWith(660, 10)
    expect(oscillatorStart).toHaveBeenCalledTimes(5)
    expect(oscillatorStop).toHaveBeenCalledWith(10.09)
  })

  it("does not duplicate a countdown beep for repeated updates in the same displayed second", () => {
    const { rerender } = renderHook(
      (intervalRemainingSeconds: number) =>
        useIntervalCountdownBeeps({
          activeSegmentIndex: 0,
          intervalRemainingSeconds,
          isActive: true,
          isComplete: false,
          paused: false,
        }),
      { initialProps: 5 }
    )

    rerender(4.8)
    rerender(4.2)
    rerender(4)

    expect(frequencySetValueAtTime).toHaveBeenCalledTimes(2)
    expect(frequencySetValueAtTime).toHaveBeenNthCalledWith(1, 660, 10)
    expect(frequencySetValueAtTime).toHaveBeenNthCalledWith(2, 660, 10)
  })

  it("plays one longer beep when moving from one interval to the next", () => {
    const { rerender } = renderHook(
      (activeSegmentIndex: number) =>
        useIntervalCountdownBeeps({
          activeSegmentIndex,
          intervalRemainingSeconds: 60,
          isActive: true,
          isComplete: false,
          paused: false,
        }),
      { initialProps: 0 }
    )

    rerender(1)
    rerender(1)

    expect(frequencySetValueAtTime).toHaveBeenCalledTimes(1)
    expect(frequencySetValueAtTime).toHaveBeenCalledWith(880, 10)
    expect(oscillatorStop).toHaveBeenCalledWith(10.36)
  })

  it("does not play the longer beep for the initial active interval", () => {
    renderHook(() =>
      useIntervalCountdownBeeps({
        activeSegmentIndex: 0,
        intervalRemainingSeconds: 60,
        isActive: true,
        isComplete: false,
        paused: false,
      })
    )

    expect(frequencySetValueAtTime).not.toHaveBeenCalled()
  })

  it("suppresses countdown beeps while paused", () => {
    const { rerender } = renderHook(
      (paused: boolean) =>
        useIntervalCountdownBeeps({
          activeSegmentIndex: 0,
          intervalRemainingSeconds: 5,
          isActive: true,
          isComplete: false,
          paused,
        }),
      { initialProps: true }
    )

    expect(frequencySetValueAtTime).not.toHaveBeenCalled()

    rerender(false)

    expect(frequencySetValueAtTime).toHaveBeenCalledTimes(1)
    expect(frequencySetValueAtTime).toHaveBeenCalledWith(660, 10)
  })

  it("does not beep for the timer state change caused by a manual seek", () => {
    const { rerender } = renderHook(
      ({
        activeSegmentIndex,
        intervalRemainingSeconds,
        suppressForSeekKey,
      }: {
        activeSegmentIndex: number
        intervalRemainingSeconds: number
        suppressForSeekKey: number
      }) =>
        useIntervalCountdownBeeps({
          activeSegmentIndex,
          intervalRemainingSeconds,
          isActive: true,
          isComplete: false,
          paused: false,
          suppressForSeekKey,
        }),
      {
        initialProps: {
          activeSegmentIndex: 0,
          intervalRemainingSeconds: 30,
          suppressForSeekKey: 0,
        },
      }
    )

    rerender({
      activeSegmentIndex: 0,
      intervalRemainingSeconds: 30,
      suppressForSeekKey: 1,
    })
    rerender({
      activeSegmentIndex: 0,
      intervalRemainingSeconds: 5,
      suppressForSeekKey: 1,
    })

    expect(frequencySetValueAtTime).not.toHaveBeenCalled()

    rerender({
      activeSegmentIndex: 0,
      intervalRemainingSeconds: 4,
      suppressForSeekKey: 1,
    })

    expect(frequencySetValueAtTime).toHaveBeenCalledTimes(1)
    expect(frequencySetValueAtTime).toHaveBeenCalledWith(660, 10)
  })

  it("does not beep on the render that marks a manual seek", () => {
    const { rerender } = renderHook(
      ({
        intervalRemainingSeconds,
        suppressForSeekKey,
      }: {
        intervalRemainingSeconds: number
        suppressForSeekKey: number
      }) =>
        useIntervalCountdownBeeps({
          activeSegmentIndex: 0,
          intervalRemainingSeconds,
          isActive: true,
          isComplete: false,
          paused: false,
          suppressForSeekKey,
        }),
      {
        initialProps: {
          intervalRemainingSeconds: 6,
          suppressForSeekKey: 0,
        },
      }
    )

    rerender({
      intervalRemainingSeconds: 5,
      suppressForSeekKey: 1,
    })

    expect(frequencySetValueAtTime).not.toHaveBeenCalled()
  })

  it("does not play the interval transition beep for a manual seek to another interval", () => {
    const { rerender } = renderHook(
      ({
        activeSegmentIndex,
        suppressForSeekKey,
      }: {
        activeSegmentIndex: number
        suppressForSeekKey: number
      }) =>
        useIntervalCountdownBeeps({
          activeSegmentIndex,
          intervalRemainingSeconds: 60,
          isActive: true,
          isComplete: false,
          paused: false,
          suppressForSeekKey,
        }),
      {
        initialProps: {
          activeSegmentIndex: 0,
          suppressForSeekKey: 0,
        },
      }
    )

    rerender({
      activeSegmentIndex: 0,
      suppressForSeekKey: 1,
    })
    rerender({
      activeSegmentIndex: 1,
      suppressForSeekKey: 1,
    })

    expect(frequencySetValueAtTime).not.toHaveBeenCalled()
  })
})
