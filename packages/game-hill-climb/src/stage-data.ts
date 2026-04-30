import type { HillClimbStage } from "./types"

export const HILL_CLIMB_STAGE: HillClimbStage = {
  id: "north-pass",
  title: "North Pass",
  description:
    "A punchy summit run with a rolling opener, a grinding middle section, and one last sting near the top.",
  segments: [
    { lengthMeters: 480, gradePercent: 2.4, label: "Valley road" },
    { lengthMeters: 620, gradePercent: 5.2, label: "Forest ramp" },
    { lengthMeters: 740, gradePercent: 7.1, label: "Middle wall" },
    { lengthMeters: 360, gradePercent: 1.4, label: "Shelf road" },
    { lengthMeters: 540, gradePercent: 8.8, label: "Summit push" },
  ],
}

export function getStageDistanceMeters(stage: HillClimbStage): number {
  return stage.segments.reduce(
    (total, segment) => total + segment.lengthMeters,
    0
  )
}
