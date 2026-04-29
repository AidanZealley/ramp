export type WorkoutInterval = {
  startPower: number
  endPower: number
  durationSeconds: number
  comment?: string
}

export type WorkoutDefinition = {
  id: string
  title: string
  intervals: ReadonlyArray<WorkoutInterval>
  powerMode: "percentage" | "absolute"
}

export type WorkoutSegment = {
  index: number
  startSeconds: number
  endSeconds: number
  targetWatts: number
  label: string
}
