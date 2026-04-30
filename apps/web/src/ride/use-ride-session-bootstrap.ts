import { useEffect, useMemo } from "react"
import { createRideSession } from "@ramp/ride-core"
import type { TrainerSource } from "@ramp/trainer-io"

export function useRideSessionBootstrap(trainer: TrainerSource) {
  const session = useMemo(() => createRideSession(), [])

  useEffect(() => {
    let mounted = true
    void session.connectTrainer(trainer).catch((error: unknown) => {
      if (mounted) console.error(error)
    })
    return () => {
      mounted = false
      void session.disconnectTrainer()
    }
  }, [session, trainer])

  return { session, trainer }
}
