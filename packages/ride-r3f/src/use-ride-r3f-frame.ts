import { useEffect, useRef } from "react"
import type { MutableRefObject } from "react"
import type { RideFrameData, RideSessionController } from "@ramp/ride-core"

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
