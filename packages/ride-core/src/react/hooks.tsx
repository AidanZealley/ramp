import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react"
import type { MutableRefObject } from "react"
import type {
  RideFrameData,
  RideSessionController,
  RideSessionState,
} from "../types"

export function useRideSession(
  session: RideSessionController
): RideSessionState {
  return useSyncExternalStore(
    session.subscribe,
    () => session.getState(),
    () => session.getState()
  )
}

/**
 * Subscribe to a slice of session state without re-rendering on every tick.
 * Useful for UI that only cares about specific fields (e.g. trainerStatus).
 */
export function useRideSelector<T>(
  session: RideSessionController,
  selector: (state: RideSessionState) => T,
  equals: (a: T, b: T) => boolean = Object.is
): T {
  const selectorRef = useRef(selector)
  const equalsRef = useRef(equals)
  selectorRef.current = selector
  equalsRef.current = equals

  const getSnapshot = useCallback(() => {
    return selectorRef.current(session.getState())
  }, [session])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let lastValue = selectorRef.current(session.getState())
      return session.subscribe(() => {
        const nextValue = selectorRef.current(session.getState())
        if (!equalsRef.current(lastValue, nextValue)) {
          lastValue = nextValue
          onStoreChange()
        }
      })
    },
    [session]
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

/**
 * Subscribe to frame events for game/render loops.
 * Callback fires on each tickTelemetry, receives telemetry and deltaMs.
 */
export function useRideFrame(
  session: RideSessionController,
  callback: (frame: RideFrameData) => void
): void {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    return session.subscribeFrame((frame) => {
      callbackRef.current(frame)
    })
  }, [session])
}

/**
 * Bridge ride-core frame events to R3F's render loop.
 * Returns a ref that updates on each ride tick; read inside R3F's useFrame
 * to get telemetry without triggering React re-renders.
 */
export function useRideR3FFrame(
  session: RideSessionController
): MutableRefObject<RideFrameData | null> {
  const frameRef = useRef<RideFrameData | null>(null)

  useEffect(() => {
    return session.subscribeFrame((frame) => {
      frameRef.current = frame
    })
  }, [session])

  return frameRef
}
