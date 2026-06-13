import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { RideRuntimeController } from "./use-ride-runtime"

const RideRuntimeContext = createContext<RideRuntimeController | null>(null)

export const RideRuntimeProvider = ({
  children,
  value,
}: {
  children: ReactNode
  value: RideRuntimeController
}) => {
  return (
    <RideRuntimeContext.Provider value={value}>
      {children}
    </RideRuntimeContext.Provider>
  )
}

export const useRideRuntimeContext = (): RideRuntimeController => {
  const runtime = useContext(RideRuntimeContext)
  if (!runtime) throw new Error("RideRuntimeContext is missing")
  return runtime
}

export const useOptionalRideRuntimeContext =
  (): RideRuntimeController | null => {
    return useContext(RideRuntimeContext)
  }
