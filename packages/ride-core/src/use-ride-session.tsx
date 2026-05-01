import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react"
import type { MutableRefObject } from "react"
import type {
  RideFrameData,
  RideSessionController,
  RideSessionState,
} from "./types"

export const RideSessionContext =
  createContext<RideSessionController | null>(null)

export function useRideSessionContext(): RideSessionController {
  const session = useContext(RideSessionContext)
  if (!session) throw new Error("RideSessionContext is missing")
  return session
}

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

// Shared heartbeat subjects per session and Hz
const heartbeatCache = new WeakMap<
  RideSessionController,
  Map<number, { count: number; listeners: Set<() => void>; timer: ReturnType<typeof setInterval> | null }>
>()

/**
 * Trigger re-render at a fixed Hz (e.g. 1 for 1 Hz, 5 for 5 Hz).
 * Returns a counter that increments at the given cadence.
 * Useful for throttled UI updates (elapsed time, power display).
 */
export function useRideHeartbeat(
  session: RideSessionController,
  hz: number = 1
): number {
  const countRef = useRef(0)

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let sessionMap = heartbeatCache.get(session)
      if (!sessionMap) {
        sessionMap = new Map()
        heartbeatCache.set(session, sessionMap)
      }

      let entry = sessionMap.get(hz)
      if (!entry) {
        entry = { count: 0, listeners: new Set(), timer: null }
        sessionMap.set(hz, entry)
        const intervalMs = 1000 / hz
        entry.timer = setInterval(() => {
          entry!.count++
          for (const listener of entry!.listeners) {
            listener()
          }
        }, intervalMs)
      }

      entry.listeners.add(onStoreChange)
      countRef.current = entry.count

      return () => {
        entry.listeners.delete(onStoreChange)
        if (entry.listeners.size === 0 && entry.timer) {
          clearInterval(entry.timer)
          entry.timer = null
          sessionMap.delete(hz)
        }
      }
    },
    [session, hz]
  )

  const getSnapshot = useCallback(() => {
    const sessionMap = heartbeatCache.get(session)
    const entry = sessionMap?.get(hz)
    return entry?.count ?? 0
  }, [session, hz])

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}
