import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react"
import { useQuery } from "convex/react"
import {
  Capability,
  useRideSelector,
} from "@ramp/ride-core"
import { createWorkoutController } from "@ramp/ride-workouts"
import { LiveWorkoutDashboard } from "./components/live-workout-dashboard"
import { WorkoutDetailPanel } from "./components/workout-detail-panel"
import { WorkoutPickerPanel } from "./components/workout-picker-panel"
import type {RideSessionController} from "@ramp/ride-core";
import type { Id } from "#convex/_generated/dataModel"
import type {ClientWorkoutDoc} from "@/ride/convex-workout-mapper";
import { api } from "#convex/_generated/api"
import { DEFAULT_FTP } from "@/lib/workout-utils"
import {
  
  InvalidWorkoutDefinitionError,
  toWorkoutDefinition
} from "@/ride/convex-workout-mapper"

type WorkoutDoc = ClientWorkoutDoc

function hasPositiveDuration(workout: WorkoutDoc | null): boolean {
  return (
    workout?.intervals.some((interval) => interval.durationSeconds > 0) ?? false
  )
}

function getWorkoutErrorCopy(reason: string | null): string | null {
  if (!reason) return null
  if (reason === "capability-unsupported") {
    return "Connected trainer does not support ERG target power."
  }
  if (reason.startsWith("invalid-workout:")) {
    return "Workout data is invalid."
  }
  if (reason.startsWith("invalid-command:")) {
    return "Workout command was rejected as unsafe."
  }
  return "Unable to start workout."
}

function getTrainerErrorCopy(code: string | undefined): string | null {
  if (!code) return null
  switch (code) {
    case "permission":
      return "Permission denied. Please allow Bluetooth access."
    case "timeout":
      return "Connection timed out. Please try again."
    case "unsupported":
      return "This trainer is not supported."
    case "command-rejected":
      return "Trainer rejected the command."
    case "transport":
      return "Communication error with trainer."
    default:
      return "An unexpected error occurred."
  }
}

export function LiveWorkoutExperienceView({
  session,
}: {
  session: RideSessionController
}) {
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const trainerStatus = useRideSelector(
    session,
    (s) => s.telemetry.trainerStatus
  )
  const lastTrainerError = useRideSelector(session, (s) => s.lastTrainerError)
  const workoutController = useMemo(
    () => createWorkoutController({ session }),
    [session]
  )

  const workoutState = useSyncExternalStore(
    workoutController.subscribe,
    workoutController.getState,
    workoutController.getState
  )

  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      workoutController.clearWorkout()
    }
  }, [workoutController])

  const workouts = useQuery(api.workouts.list)
  const settings = useQuery(api.settings.get)

  const [selectedWorkoutId, setSelectedWorkoutId] =
    useState<Id<"workouts"> | null>(null)
  const [activeWorkout, setActiveWorkout] = useState<WorkoutDoc | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  const ftp = settings?.ftp ?? DEFAULT_FTP
  const supportsTargetPower = session.controls
    .getCapabilities()
    .has(Capability.TargetPower)

  const isLoading = workouts === undefined || settings === undefined
  const selectedWorkout: WorkoutDoc | null =
    workouts?.find((workout) => workout._id === selectedWorkoutId) ?? null
  const selectedWorkoutHasDuration = hasPositiveDuration(selectedWorkout)

  useEffect(() => {
    setStartError(null)
  }, [selectedWorkoutId, trainerConnected, supportsTargetPower])

  const handleStart = useCallback(async () => {
    if (!selectedWorkout || !trainerConnected || !selectedWorkoutHasDuration) {
      console.info("[live-workout] start ignored", {
        hasWorkout: Boolean(selectedWorkout),
        trainerConnected,
        selectedWorkoutHasDuration,
      })
      return
    }

    setIsStarting(true)
    console.info("[live-workout] start requested", {
      workoutId: selectedWorkout._id,
      title: selectedWorkout.title,
      trainerConnected,
      supportsTargetPower,
      capabilities: Array.from(session.controls.getCapabilities()),
    })

    try {
      const definition = toWorkoutDefinition(selectedWorkout)
      const result = await workoutController.loadWorkout(definition, ftp)
      console.info("[live-workout] loadWorkout result", result)
      if (!mounted.current) return
      if (!result.ok) {
        setStartError(getWorkoutErrorCopy(result.reason))
        setActiveWorkout(null)
        return
      }
      setStartError(null)
      setActiveWorkout(selectedWorkout)
    } catch (error: unknown) {
      console.error("[live-workout] start failed", error)
      if (!mounted.current) return
      setActiveWorkout(null)
      if (error instanceof InvalidWorkoutDefinitionError) {
        setStartError("Workout data is invalid.")
        return
      }
      setStartError("Unable to start workout.")
    } finally {
      if (mounted.current) {
        setIsStarting(false)
      }
    }
  }, [
    ftp,
    selectedWorkout,
    selectedWorkoutHasDuration,
    session,
    supportsTargetPower,
    trainerConnected,
    workoutController,
  ])

  const handleEnd = useCallback(() => {
    workoutController.clearWorkout()
    setActiveWorkout(null)
    setStartError(null)
  }, [workoutController])

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto px-4 pt-16 pb-6 sm:px-8 sm:pt-20">
      {activeWorkout ? (
        <LiveWorkoutDashboard
          ftp={ftp}
          onEnd={handleEnd}
          onPause={session.pause}
          onResume={session.resume}
          session={session}
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
            isStarting={isStarting}
            onStart={() => {
              void handleStart()
            }}
            startError={
              startError ??
              getTrainerErrorCopy(lastTrainerError?.code) ??
              getWorkoutErrorCopy(workoutState.lastError)
            }
            trainerConnected={trainerConnected}
            trainerStatus={trainerStatus}
            trainerSupportsTargetPower={supportsTargetPower}
            workout={selectedWorkout}
            workoutHasDuration={selectedWorkoutHasDuration}
          />
        </div>
      )}
    </div>
  )
}
