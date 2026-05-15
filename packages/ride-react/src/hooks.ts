import { useCallback, useEffect, useRef, useSyncExternalStore } from "react"
import type { MutableRefObject } from "react"
import type { RideFrameData, RideSessionState } from "@ramp/ride-core"

export type RideStore = {
  getState: () => RideSessionState
  subscribe: (listener: () => void) => () => void
}

export type RideFrameSource = {
  subscribeFrame: (listener: (frame: RideFrameData) => void) => () => void
}

export function useRideSession(session: RideStore): RideSessionState {
  return useSyncExternalStore(
    session.subscribe,
    () => session.getState(),
    () => session.getState()
  )
}

export function useRideSelector<T>(
  session: RideStore,
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

export function useRideThrottledSelector<T>(
  session: RideStore,
  selector: (state: RideSessionState) => T,
  options: {
    hz: number
    equals?: (a: T, b: T) => boolean
  }
): T {
  const selectorRef = useRef(selector)
  const equalsRef = useRef(options.equals ?? Object.is)
  const hzRef = useRef(options.hz)
  selectorRef.current = selector
  equalsRef.current = options.equals ?? Object.is
  hzRef.current = options.hz

  const valueRef = useRef(selector(session.getState()))

  const getSnapshot = useCallback(() => valueRef.current, [])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      let latestValue = selectorRef.current(session.getState())
      valueRef.current = latestValue

      const unsubscribe = session.subscribe(() => {
        latestValue = selectorRef.current(session.getState())
      })
      const interval = setInterval(() => {
        if (!equalsRef.current(valueRef.current, latestValue)) {
          valueRef.current = latestValue
          onStoreChange()
        }
      }, 1000 / hzRef.current)

      return () => {
        unsubscribe()
        clearInterval(interval)
      }
    },
    [session]
  )

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useRideFrame(
  session: RideFrameSource,
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

export function useRideFrameRef(
  session: RideFrameSource
): MutableRefObject<RideFrameData | null> {
  const frameRef = useRef<RideFrameData | null>(null)

  useEffect(() => {
    return session.subscribeFrame((frame) => {
      frameRef.current = frame
    })
  }, [session])

  return frameRef
}

const heartbeatCache = new WeakMap<
  RideStore,
  Map<
    number,
    {
      count: number
      listeners: Set<() => void>
      timer: ReturnType<typeof setInterval> | null
    }
  >
>()

export function useRideHeartbeat(session: RideStore, hz: number = 1): number {
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
          for (const listener of entry!.listeners) listener()
        }, intervalMs)
      }

      entry.listeners.add(onStoreChange)

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
