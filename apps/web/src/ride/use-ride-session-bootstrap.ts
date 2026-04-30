import { useEffect, useMemo } from "react"
import { createRideSession } from "@ramp/ride-core"
import type { TrainerSource } from "@ramp/trainer-io"

export function useRideSessionBootstrap(trainer: TrainerSource) {
  const session = useMemo(() => createRideSession(), [])

  useEffect(() => {
    void session.connectTrainer(trainer).catch((error: unknown) => {
      console.error(error)
    })
    return () => {
      void session.disconnectTrainer()
    }
  }, [session, trainer])

  return { session, trainer }
}
