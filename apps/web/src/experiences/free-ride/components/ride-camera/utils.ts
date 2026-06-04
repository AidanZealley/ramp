import { FREE_RIDE_CAMERA } from "../../free-ride-config"
import { clamp } from "../../track"

export function getGradeHeightBiasTarget(grade: number): number {
  const gradeRatio = clamp(
    (grade * 100) / FREE_RIDE_CAMERA.gradeHeightBiasFullGradePercent,
    -1,
    1
  )

  if (gradeRatio === 0) return 0

  return -gradeRatio * FREE_RIDE_CAMERA.gradeHeightBiasMeters
}
