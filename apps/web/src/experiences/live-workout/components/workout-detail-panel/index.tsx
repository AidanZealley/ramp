import { Play, RefreshCw } from "lucide-react"
import type { RideTelemetry } from "@ramp/ride-core"
import type { ClientWorkoutDoc } from "@/ride/convex-workout-mapper"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrainerStatusBadge } from "./components/trainer-status-badge"
import { WorkoutDetail } from "./components/workout-detail"

type TrainerStatus = RideTelemetry["trainerStatus"]

type WorkoutDetailPanelProps = {
  ftp: number
  isLoading: boolean
  onStart: () => void
  startError: string | null
  trainerConnected: boolean
  trainerStatus: TrainerStatus
  trainerSupportsTargetPower: boolean
  workout: ClientWorkoutDoc | null
  workoutHasDuration: boolean
}

export function WorkoutDetailPanel({
  ftp,
  isLoading,
  onStart,
  startError,
  trainerConnected,
  trainerStatus,
  trainerSupportsTargetPower,
  workout,
  workoutHasDuration,
}: WorkoutDetailPanelProps) {
  const startDisabled =
    !workout ||
    !trainerConnected ||
    isLoading ||
    !workoutHasDuration ||
    !trainerSupportsTargetPower

  return (
    <Card
      size="sm"
      className="flex max-h-[calc(100svh-9rem)] flex-col bg-background/85 shadow-xl backdrop-blur-md"
    >
      <CardContent className="flex flex-1 flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-base font-semibold tracking-tight">
            Selected workout
          </h2>
          <TrainerStatusBadge status={trainerStatus} />
        </div>

        {isLoading ? (
          <div className="flex flex-1 flex-col gap-3">
            <Skeleton className="h-24 w-full rounded-3xl" />
            <Skeleton className="h-4 w-2/3 rounded-full" />
            <Skeleton className="h-4 w-1/2 rounded-full" />
          </div>
        ) : !workout ? (
          <div className="flex flex-1 items-center justify-center rounded-3xl border border-dashed border-border/70 bg-background/60 px-4 py-10 text-center text-sm text-muted-foreground">
            Pick a workout from the list to see its preview.
          </div>
        ) : (
          <WorkoutDetail workout={workout} ftp={ftp} />
        )}

        <Button
          type="button"
          size="lg"
          onClick={onStart}
          disabled={startDisabled}
          className="w-full"
        >
          <Play data-icon="inline-start" />
          Start workout
        </Button>
        <p className="text-center text-[0.7rem] text-muted-foreground">
          {!trainerConnected
            ? "Waiting for the trainer to connect."
            : !trainerSupportsTargetPower
              ? "Connected trainer does not support ERG target power."
              : !workout
                ? "Pick a workout to begin."
                : !workoutHasDuration
                  ? "Workout needs at least one timed interval."
                  : `ERG mode at FTP ${ftp} W`}
        </p>
        {startError ? (
          <div className="flex flex-col items-center gap-2">
            <p className="text-center text-[0.75rem] text-destructive">
              {startError}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onStart}
              disabled={!trainerConnected}
            >
              <RefreshCw data-icon="inline-start" />
              Retry
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
