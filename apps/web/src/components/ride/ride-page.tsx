import { useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "convex/react"
import {
  createRideSimulator,
  getWorkoutSegmentAtElapsed,
  type RideInputMode,
  type RideTelemetry,
  type WorkoutInterval,
} from "@ramp/ride-engine"
import { api } from "#convex/_generated/api"
import { RideScene } from "./ride-scene"
import { RideHud } from "./ride-hud"
import { RideSimulatorControls } from "./ride-simulator-controls"

export type RideWorkout = {
  id: string
  title: string
  intervals: Array<WorkoutInterval>
}

export function RidePage() {
  const simulatorRef = useRef(
    createRideSimulator({
      input: { powerWatts: 180, cadenceRpm: 90, mode: "manual" },
    })
  )
  const simulator = simulatorRef.current
  const workouts = useQuery(api.workouts.list)
  const settings = useQuery(api.settings.get)
  const [paused, setPaused] = useState(false)
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>("")
  const [telemetry, setTelemetry] = useState<RideTelemetry>(
    simulator.getTelemetry()
  )
  const [input, setInput] = useState(simulator.getInput())

  const rideWorkouts = useMemo<Array<RideWorkout>>(
    () =>
      workouts?.map((workout) => ({
        id: workout._id,
        title: workout.title,
        intervals: workout.intervals,
      })) ?? [],
    [workouts]
  )

  const selectedWorkout =
    rideWorkouts.find((workout) => workout.id === selectedWorkoutId) ??
    rideWorkouts[0] ??
    null
  const ftpWatts = settings?.ftp ?? 150
  const activeSegment = useMemo(
    () =>
      selectedWorkout
        ? getWorkoutSegmentAtElapsed(
            selectedWorkout.intervals,
            telemetry.elapsedSeconds,
            ftpWatts
          )
        : null,
    [ftpWatts, selectedWorkout, telemetry.elapsedSeconds]
  )
  const targetWatts = activeSegment?.targetWatts ?? 180

  useEffect(() => {
    if (!selectedWorkoutId && rideWorkouts.length > 0) {
      setSelectedWorkoutId(rideWorkouts[0].id)
    }
  }, [rideWorkouts, selectedWorkoutId])

  useEffect(() => {
    if (input.mode !== "followWorkout" || !activeSegment) return
    simulator.setInput({ powerWatts: activeSegment.targetWatts })
    setInput(simulator.getInput())
  }, [activeSegment?.targetWatts, input.mode, simulator])

  useFixedSimulationTick(paused, () => {
    setTelemetry(simulator.tick(0.1))
  })

  const updateInput = (nextInput: Partial<typeof input>) => {
    simulator.setInput(nextInput)
    setInput(simulator.getInput())
    setTelemetry(simulator.getTelemetry())
  }

  const setPreset = (preset: "endurance" | "tempo" | "vo2" | "workout") => {
    if (preset === "workout") {
      updateInput({ mode: "followWorkout", powerWatts: targetWatts })
      return
    }

    const presetWatts = {
      endurance: 180,
      tempo: 240,
      vo2: 330,
    }[preset]

    updateInput({ mode: "manual", powerWatts: presetWatts })
  }

  return (
    <section className="relative h-svh min-h-[620px] overflow-hidden bg-[#b9d6d0] text-[#14201b]">
      <div className="ride-world-fallback" aria-hidden="true">
        <div className="ride-world-fallback__field ride-world-fallback__field--left" />
        <div className="ride-world-fallback__field ride-world-fallback__field--right" />
        <div className="ride-world-fallback__road" />
        <div className="ride-world-fallback__road-line" />
        <div className="ride-world-fallback__tree ride-world-fallback__tree--one" />
        <div className="ride-world-fallback__tree ride-world-fallback__tree--two" />
        <div className="ride-world-fallback__tree ride-world-fallback__tree--three" />
      </div>
      <RideScene telemetry={telemetry} />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0)_34%,rgba(34,46,38,0.22))]" />
      <div className="pointer-events-none absolute inset-0 flex items-start justify-between gap-4 p-4">
        <RideHud
          activeSegment={activeSegment}
          source="Simulator"
          targetWatts={targetWatts}
          telemetry={telemetry}
        />
        <RideSimulatorControls
          cadenceRpm={input.cadenceRpm}
          mode={input.mode}
          onCadenceChange={(cadenceRpm) => updateInput({ cadenceRpm })}
          onModeChange={(mode: RideInputMode) => updateInput({ mode })}
          onPauseToggle={() => setPaused((value) => !value)}
          onPowerChange={(powerWatts) =>
            updateInput({ mode: "manual", powerWatts })
          }
          onPreset={setPreset}
          onWorkoutChange={setSelectedWorkoutId}
          paused={paused}
          powerWatts={input.powerWatts}
          selectedWorkoutId={selectedWorkout?.id ?? ""}
          workouts={rideWorkouts}
        />
      </div>
    </section>
  )
}

function useFixedSimulationTick(paused: boolean, tick: () => void) {
  const tickRef = useRef(tick)
  tickRef.current = tick

  useEffect(() => {
    if (import.meta.env.MODE === "test") return
    if (paused) return

    const timer = window.setInterval(() => {
      tickRef.current()
    }, 100)

    return () => window.clearInterval(timer)
  }, [paused])
}
