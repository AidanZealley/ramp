import { useEffect, useState } from "react"
import { Pause, Play } from "lucide-react"
import { motion } from "motion/react"
import { useRideSession, useRideSessionContext } from "@ramp/ride-core"
import { CockpitMetric } from "./components/cockpit-metric"
import { CockpitModeSelect } from "./components/cockpit-mode-select"
import { CockpitRangeControl } from "./components/cockpit-range-control"
import { CockpitSection } from "./components/cockpit-section"
import type { Ref } from "react"
import type {
  RiderPowerMode,
  SimulatedRiderState,
  SimulatedTrainerMode,
  SimulatedTrainerState,
} from "@ramp/trainer-io"
import type { RideTrainerController } from "@/ride/use-ride-trainer"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/lib/workout-utils"

type RideCockpitProps = {
  trainerController: RideTrainerController
  riderState: SimulatedRiderState | null
  rootRef?: Ref<HTMLDivElement>
}

const riderModeOptions: Array<{
  label: string
  value: RiderPowerMode
}> = [
  { label: "Auto ERG", value: "erg-auto" },
  { label: "Manual", value: "manual" },
]

const trainerModeOptions: Array<{
  label: string
  value: SimulatedTrainerMode
}> = [
  { label: "Free", value: "free" },
  { label: "ERG", value: "erg" },
  { label: "Simulation", value: "simulation" },
  { label: "Resistance", value: "resistance" },
]

export function RideCockpit({
  trainerController,
  riderState,
  rootRef,
}: RideCockpitProps) {
  const session = useRideSessionContext()
  const { telemetry } = useRideSession(session)
  const simulatedRider = trainerController.simulatedRider
  const simulatedTrainer = trainerController.simulatedTrainer
  const [trainerState, setTrainerState] =
    useState<SimulatedTrainerState | null>(simulatedTrainer?.simulator ?? null)

  useEffect(() => {
    if (!simulatedTrainer) {
      setTrainerState(null)
      return
    }

    setTrainerState(simulatedTrainer.simulator)
    return simulatedTrainer.subscribeSimulatorState(setTrainerState)
  }, [simulatedTrainer])

  const showSimulatorControls =
    trainerController.devSimulationEnabled &&
    trainerController.source === "simulated" &&
    simulatedRider &&
    simulatedTrainer &&
    riderState &&
    trainerState

  const status = telemetry.trainerStatus === "ready" ? "Connected" : "Free ride"
  const source = telemetry.telemetrySource ?? "None"

  return (
    <motion.div
      ref={rootRef}
      className="pointer-events-auto fixed inset-x-0 bottom-0 p-6"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="mx-auto grid w-full max-w-7xl gap-3 rounded-4xl border bg-background/50 p-6 backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 sm:grid-cols-6">
          <CockpitMetric
            label="Power"
            value={`${Math.round(telemetry.powerWatts ?? 0)} W`}
          />
          <CockpitMetric
            label="Cadence"
            value={`${Math.round(telemetry.cadenceRpm ?? 0)} rpm`}
          />
          <CockpitMetric
            label="Speed"
            value={`${((telemetry.speedMps ?? 0) * 3.6).toFixed(1)} km/h`}
          />
          <CockpitMetric
            label="Time"
            value={formatDuration(telemetry.elapsedSeconds)}
          />
          <CockpitMetric
            label="Distance"
            value={`${(telemetry.distanceMeters / 1000).toFixed(2)} km`}
          />
          <CockpitMetric label="Status" value={`${status} · ${source}`} />
        </div>

        {showSimulatorControls ? (
          <div className="grid gap-4 border-t border-border/50 pt-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]">
            <CockpitSection title="Rider controls">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CockpitModeSelect
                  ariaLabel="Rider power mode"
                  value={riderState.powerMode}
                  options={riderModeOptions}
                  onChange={(mode) =>
                    simulatedRider.dispatch({ type: "setPowerMode", mode })
                  }
                />
                <Button
                  aria-label={riderState.paused ? "Resume ride" : "Pause ride"}
                  className="h-8"
                  size="icon-sm"
                  type="button"
                  variant={riderState.paused ? "default" : "secondary"}
                  onClick={() =>
                    simulatedRider.dispatch({
                      type: "setPaused",
                      paused: !riderState.paused,
                    })
                  }
                >
                  {riderState.paused ? <Play /> : <Pause />}
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <CockpitRangeControl
                  label="Power"
                  max={700}
                  min={0}
                  onChange={(watts) =>
                    simulatedRider.dispatch({
                      type: "setManualPower",
                      watts,
                    })
                  }
                  step={5}
                  unit="W"
                  value={riderState.powerWatts}
                />
                <CockpitRangeControl
                  label="Cadence"
                  max={130}
                  min={40}
                  onChange={(rpm) =>
                    simulatedRider.dispatch({ type: "setCadence", rpm })
                  }
                  step={1}
                  unit="rpm"
                  value={riderState.cadenceRpm}
                />
              </div>
            </CockpitSection>

            <CockpitSection title="Trainer controls">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <CockpitModeSelect
                  ariaLabel="Trainer mode"
                  value={trainerState.mode}
                  options={trainerModeOptions}
                  onChange={(mode) => {
                    void simulatedTrainer.sendCommand({ type: "setMode", mode })
                  }}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <CockpitRangeControl
                  label="Gradient"
                  min={-15}
                  max={15}
                  step={0.5}
                  unit="%"
                  value={trainerState.gradePercent}
                  formatValue={(value) => `${value.toFixed(1)}%`}
                  onChange={(gradePercent) => {
                    void simulatedTrainer.sendCommand({
                      type: "setSimulationGrade",
                      gradePercent,
                      windSpeedMps: trainerState.windSpeedMps,
                    })
                  }}
                />
                <CockpitRangeControl
                  label="Resistance"
                  min={0}
                  max={100}
                  step={1}
                  unit=""
                  value={trainerState.resistanceLevel ?? 0}
                  onChange={(level) => {
                    void simulatedTrainer.sendCommand({
                      type: "setResistance",
                      level,
                    })
                  }}
                />
                <CockpitRangeControl
                  label="ERG target"
                  min={0}
                  max={700}
                  step={5}
                  unit="W"
                  value={trainerState.targetPowerWatts ?? 0}
                  onChange={(watts) => {
                    void simulatedTrainer.sendCommand({
                      type: "setTargetPower",
                      watts,
                    })
                  }}
                />
              </div>
            </CockpitSection>
          </div>
        ) : null}
      </div>
    </motion.div>
  )
}
