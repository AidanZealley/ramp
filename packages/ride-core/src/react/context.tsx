import { createContext, useContext } from "react"
import type { RideSessionController } from "../types"

export const RideSessionContext = createContext<RideSessionController | null>(
  null
)

export function useRideSessionContext(): RideSessionController {
  const session = useContext(RideSessionContext)
  if (!session) throw new Error("RideSessionContext is missing")
  return session
}
