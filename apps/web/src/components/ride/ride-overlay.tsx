import { useSyncExternalStore } from "react"
import type { MockTrainer } from "@ramp/trainer-io"
import { useRideSession, type RideSessionController } from "@ramp/ride-core"
import type {
  WorkoutDefinition,
  WorkoutSessionController,
} from "@ramp/ride-workouts"
import { RideHud } from "./ride-hud"
import { RideSimulatorControls } from "./ride-simulator-controls"

type RideOverlayProps = {
  ftpWatts: number
  selectedWorkoutId: string
  session: RideSessionController
  trainer: MockTrainer
  workoutController: WorkoutSessionController
  workouts: Array<WorkoutDefinition>
  onWorkoutChange(workoutId: string): void
}

export function RideOverlay({
  ftpWatts,
  onWorkoutChange,
  selectedWorkoutId,
  session,
  trainer,
  workoutController,
  workouts,
}: RideOverlayProps) {
  const state = useRideSession(session)
  const workoutState = useSyncExternalStore(
    workoutController.subscribe,
    workoutController.getState,
    workoutController.getState
  )
  const selectedWorkout =
    workouts.find((workout) => workout.id === selectedWorkoutId) ??
    workouts[0] ??
    null

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-between gap-4 p-4">
      <RideHud workoutState={workoutState} />
      <RideSimulatorControls
        cadenceRpm={state.telemetry.cadenceRpm ?? 90}
        mode={state.activeControlMode === "workout" ? "followWorkout" : "manual"}
        onCadenceChange={(cadenceRpm) => {
          trainer.setManualOverrides({ cadenceRpm })
        }}
        onModeChange={(mode) => {
          if (mode === "followWorkout" && selectedWorkout) {
            workoutController.loadWorkout(selectedWorkout, ftpWatts)
            return
          }
          workoutController.clearWorkout()
        }}
        onPauseToggle={() => {
          if (state.paused) session.resume()
          else session.pause()
        }}
        onPowerChange={(powerWatts) => {
          if (state.activeControlMode === "workout") {
            workoutController.clearWorkout()
          }
          trainer.setManualOverrides({ powerWatts })
        }}
        onPreset={(preset) => {
          if (preset === "workout" && selectedWorkout) {
            workoutController.loadWorkout(selectedWorkout, ftpWatts)
            return
          }
          const powerWatts = {
            endurance: 180,
            tempo: 240,
            vo2: 330,
            workout: 180,
          }[preset]
          workoutController.clearWorkout()
          trainer.setManualOverrides({ powerWatts })
        }}
        onWorkoutChange={onWorkoutChange}
        paused={state.paused}
        powerWatts={
          workoutState.targetWatts ?? state.telemetry.powerWatts ?? 180
        }
        selectedWorkoutId={selectedWorkout?.id ?? ""}
        workouts={workouts}
      />
    </div>
  )
}
