import { createContext, useContext, useSyncExternalStore } from "react"
import type { RideSessionController, RideSessionState } from "./types"

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
