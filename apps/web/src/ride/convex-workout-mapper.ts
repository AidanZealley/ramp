import type { WorkoutDefinition, WorkoutInterval } from "@ramp/ride-workouts"
import type { Doc } from "#convex/_generated/dataModel"

const MAX_WORKOUT_DURATION_SECONDS = 24 * 60 * 60
const MAX_WORKOUT_POWER_PERCENT = 300

export class InvalidWorkoutDefinitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "InvalidWorkoutDefinitionError"
  }
}

export type ClientWorkoutDoc = Omit<Doc<"workouts">, "powerMode"> & {
  intervalsRevision: number
}

export function toWorkoutDefinition(doc: ClientWorkoutDoc): WorkoutDefinition {
  const title = doc.title.replace(/\s+/g, " ").trim()
  if (!title) {
    throw new InvalidWorkoutDefinitionError("Workout title is empty")
  }

  return {
    id: doc._id,
    title,
    intervals: doc.intervals.map(validateInterval),
    powerMode: "percentage",
  }
}

function validateInterval(
  interval: ClientWorkoutDoc["intervals"][number],
  index: number
): WorkoutInterval {
  assertFiniteNumberInRange(
    interval.startPower,
    0,
    MAX_WORKOUT_POWER_PERCENT,
    `intervals[${index}].startPower`
  )
  assertFiniteNumberInRange(
    interval.endPower,
    0,
    MAX_WORKOUT_POWER_PERCENT,
    `intervals[${index}].endPower`
  )
  if (!Number.isFinite(interval.durationSeconds)) {
    throw new InvalidWorkoutDefinitionError(
      `intervals[${index}].durationSeconds must be finite`
    )
  }
  if (!Number.isInteger(interval.durationSeconds)) {
    throw new InvalidWorkoutDefinitionError(
      `intervals[${index}].durationSeconds must be an integer`
    )
  }
  if (
    interval.durationSeconds < 0 ||
    interval.durationSeconds > MAX_WORKOUT_DURATION_SECONDS
  ) {
    throw new InvalidWorkoutDefinitionError(
      `intervals[${index}].durationSeconds is out of range`
    )
  }
  const comment = interval.comment?.trim()
  return comment
    ? { ...interval, comment }
    : { ...interval, comment: undefined }
}

function assertFiniteNumberInRange(
  value: number,
  min: number,
  max: number,
  label: string
) {
  if (!Number.isFinite(value)) {
    throw new InvalidWorkoutDefinitionError(`${label} must be finite`)
  }
  if (value < min || value > max) {
    throw new InvalidWorkoutDefinitionError(`${label} is out of range`)
  }
}
