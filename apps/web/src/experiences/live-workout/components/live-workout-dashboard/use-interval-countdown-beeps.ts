import { useEffect, useRef } from "react"
import type { MutableRefObject } from "react"

export type UseIntervalCountdownBeepsOptions = {
  activeSegmentIndex: number | null
  intervalRemainingSeconds: number
  isActive: boolean
  isComplete: boolean
  paused: boolean
  suppressForSeekKey?: number
}

type BeepOptions = {
  frequencyHz: number
  durationMs: number
  gain: number
}

type AudioContextConstructor = typeof AudioContext

type WindowWithAudioConstructors = {
  AudioContext?: AudioContextConstructor
  webkitAudioContext?: AudioContextConstructor
}

const countdownBeep: BeepOptions = {
  frequencyHz: 660,
  durationMs: 90,
  gain: 0.16,
}

const nextIntervalBeep: BeepOptions = {
  frequencyHz: 880,
  durationMs: 360,
  gain: 0.22,
}

function getAudioContextConstructor(): AudioContextConstructor | null {
  if (typeof window === "undefined") return null

  const audioWindow = window as unknown as WindowWithAudioConstructors
  return audioWindow.AudioContext ?? audioWindow.webkitAudioContext ?? null
}

function playBeep(
  audioContextRef: MutableRefObject<AudioContext | null>,
  options: BeepOptions
) {
  const AudioContextConstructor = getAudioContextConstructor()
  if (!AudioContextConstructor) return

  try {
    const audioContext =
      audioContextRef.current ?? new AudioContextConstructor()
    audioContextRef.current = audioContext

    if (audioContext.state === "suspended") {
      void audioContext.resume().catch(() => undefined)
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    const now = audioContext.currentTime
    const stopAt = now + options.durationMs / 1000

    oscillator.type = "sine"
    oscillator.frequency.setValueAtTime(options.frequencyHz, now)
    gainNode.gain.setValueAtTime(options.gain, now)
    gainNode.gain.setValueAtTime(options.gain, stopAt - 0.04)
    gainNode.gain.exponentialRampToValueAtTime(0.001, stopAt)

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.start(now)
    oscillator.stop(stopAt)
  } catch {
    // Audio cues are best-effort and should never interrupt the workout UI.
  }
}

export function useIntervalCountdownBeeps({
  activeSegmentIndex,
  intervalRemainingSeconds,
  isActive,
  isComplete,
  paused,
  suppressForSeekKey = 0,
}: UseIntervalCountdownBeepsOptions) {
  const audioContextRef = useRef<AudioContext | null>(null)
  const previousSegmentIndexRef = useRef<number | null>(activeSegmentIndex)
  const beepedCountdownSecondsRef = useRef<Set<number>>(new Set())
  const previousSuppressForSeekKeyRef = useRef(suppressForSeekKey)
  const pendingSeekSuppressionRef = useRef<{
    activeSegmentIndex: number | null
    remainingSecond: number
  } | null>(null)

  useEffect(() => {
    const remainingSecond = Math.ceil(intervalRemainingSeconds)

    if (previousSuppressForSeekKeyRef.current !== suppressForSeekKey) {
      previousSuppressForSeekKeyRef.current = suppressForSeekKey
      pendingSeekSuppressionRef.current = {
        activeSegmentIndex,
        remainingSecond,
      }
      return
    }

    const pendingSeekSuppression = pendingSeekSuppressionRef.current
    if (
      pendingSeekSuppression &&
      (pendingSeekSuppression.activeSegmentIndex !== activeSegmentIndex ||
        pendingSeekSuppression.remainingSecond !== remainingSecond)
    ) {
      pendingSeekSuppressionRef.current = null
      beepedCountdownSecondsRef.current = new Set()
      previousSegmentIndexRef.current = activeSegmentIndex
      return
    }

    const previousSegmentIndex = previousSegmentIndexRef.current
    const segmentChanged = previousSegmentIndex !== activeSegmentIndex

    if (isComplete || activeSegmentIndex === null) {
      beepedCountdownSecondsRef.current = new Set()
      previousSegmentIndexRef.current = activeSegmentIndex
      return
    }

    if (segmentChanged) {
      beepedCountdownSecondsRef.current = new Set()
    }

    if (!isActive || paused) {
      previousSegmentIndexRef.current = activeSegmentIndex
      return
    }

    const isRealIntervalTransition =
      previousSegmentIndex !== null &&
      previousSegmentIndex !== activeSegmentIndex

    if (isRealIntervalTransition) {
      playBeep(audioContextRef, nextIntervalBeep)
    }

    if (
      remainingSecond >= 1 &&
      remainingSecond <= 5 &&
      !beepedCountdownSecondsRef.current.has(remainingSecond)
    ) {
      beepedCountdownSecondsRef.current.add(remainingSecond)
      playBeep(audioContextRef, countdownBeep)
    }

    previousSegmentIndexRef.current = activeSegmentIndex
  }, [
    activeSegmentIndex,
    intervalRemainingSeconds,
    isActive,
    isComplete,
    paused,
    suppressForSeekKey,
  ])
}
