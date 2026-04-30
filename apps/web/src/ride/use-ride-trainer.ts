import { useMemo } from "react"
import { MockTrainer  } from "@ramp/trainer-io"
import type {TrainerSource} from "@ramp/trainer-io";

export function useRideTrainer(): TrainerSource {
  return useMemo(() => new MockTrainer(), [])
}
