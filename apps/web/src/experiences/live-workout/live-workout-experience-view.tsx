import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react"
import { useQuery } from "convex/react"
import { createWorkoutController } from "@ramp/ride-workouts"
import {  useRideSession } from "@ramp/ride-core"
import { LiveWorkoutDashboard } from "./components/live-workout-dashboard"
import { WorkoutDetailPanel } from "./components/workout-detail-panel"
import { WorkoutPickerPanel } from "./components/workout-picker-panel"
import type {RideSessionController} from "@ramp/ride-core";
import type { Id } from "#convex/_generated/dataModel"
import type {ClientWorkoutDoc} from "@/ride/convex-workout-mapper";
import { api } from "#convex/_generated/api"
import {
  
  toWorkoutDefinition
} from "@/ride/convex-workout-mapper"
import { DEFAULT_FTP } from "@/lib/workout-utils"

type WorkoutDoc = ClientWorkoutDoc

function hasPositiveDuration(workout: WorkoutDoc | null): boolean {
  return (
    workout?.intervals.some((interval) => interval.durationSeconds > 0) ?? false
  )
}

export function LiveWorkoutExperienceView({
  session,
}: {
  session: RideSessionController
}) {
  const sessionState = useRideSession(session)
  const workoutController = useMemo(
    () => createWorkoutController({ session }),
    [session]
  )

  useEffect(
    () => () => {
      workoutController.dispose()
    },
    [workoutController]
  )

  const workoutState = useSyncExternalStore(
    workoutController.subscribe,
    workoutController.getState,
    workoutController.getState
  )

  const workouts = useQuery(api.workouts.list)
  const settings = useQuery(api.settings.get)

  const [selectedWorkoutId, setSelectedWorkoutId] =
    useState<Id<"workouts"> | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<WorkoutDoc | null>(null)

  const ftp = settings?.ftp ?? DEFAULT_FTP
  const trainerConnected = sessionState.trainerConnected
  const trainerStatus = sessionState.telemetry.trainerStatus

  const isLoading = workouts === undefined || settings === undefined
  const selectedWorkout: WorkoutDoc | null =
    workouts?.find((workout) => workout._id === selectedWorkoutId) ?? null
  const selectedWorkoutHasDuration = hasPositiveDuration(selectedWorkout)

  const handleStart = useCallback(() => {
    if (!selectedWorkout) return
    if (!trainerConnected) return
    if (!hasPositiveDuration(selectedWorkout)) return
    workoutController.loadWorkout(toWorkoutDefinition(selectedWorkout), ftp)
    setActiveWorkout(selectedWorkout)
  }, [ftp, selectedWorkout, trainerConnected, workoutController])

  const handleEnd = useCallback(() => {
    workoutController.clearWorkout()
    setActiveWorkout(null)
  }, [workoutController])

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto px-4 pt-16 pb-6 sm:px-8 sm:pt-20">
      {activeWorkout ? (
        <LiveWorkoutDashboard
          ftp={ftp}
          onEnd={handleEnd}
          workout={activeWorkout}
          workoutState={workoutState}
        />
      ) : (
        <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <WorkoutPickerPanel
            isLoading={isLoading}
            onSelect={setSelectedWorkoutId}
            selectedWorkoutId={selectedWorkoutId}
            workouts={workouts ?? []}
          />
          <WorkoutDetailPanel
            ftp={ftp}
            isLoading={isLoading}
            onStart={handleStart}
            trainerConnected={trainerConnected}
            trainerStatus={trainerStatus}
            workout={selectedWorkout}
            workoutHasDuration={selectedWorkoutHasDuration}
          />
        </div>
      )}
    </div>
  )
}
