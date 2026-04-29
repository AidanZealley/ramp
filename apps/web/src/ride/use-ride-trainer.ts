import { useMemo } from "react"
import { MockTrainer } from "@ramp/trainer-io"

export function useRideTrainer() {
  return useMemo(() => new MockTrainer(), [])
}
