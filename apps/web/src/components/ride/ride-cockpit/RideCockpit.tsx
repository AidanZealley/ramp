import { Pause, Play } from "lucide-react"
import { motion } from "motion/react"
import {
  useRideSessionContext,
  useRideThrottledSelector,
} from "@ramp/ride-react"
import { CockpitMetric } from "./components/cockpit-metric"
import { CockpitModeSelect } from "./components/cockpit-mode-select"
import { CockpitRangeControl } from "./components/cockpit-range-control"
import { CockpitSection } from "./components/cockpit-section"
import type { Ref } from "react"
import type { RiderPowerMode, SimulatedTrainerMode } from "@ramp/trainer-io"
import type {RideRuntimeController} from "@/ride/use-ride-runtime";
import {
  
  useRideSimulatorControls
} from "@/ride/use-ride-runtime"
import { Button } from "@/components/ui/button"
import { formatDuration } from "@/lib/workout-utils"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RideCockpitProps = {
  trainerController: RideRuntimeController
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

export function RideCockpit({ trainerController, rootRef }: RideCockpitProps) {
  const session = useRideSessionContext()
  const telemetry = useRideThrottledSelector(session, (s) => s.telemetry, {
    hz: 2,
  })
  const simulatorControls = useRideSimulatorControls(trainerController)
  const units = useUnitFormatters()
  const riderState = simulatorControls.riderState
  const trainerState = simulatorControls.trainerState

  const showSimulatorControls =
    trainerController.source === "simulated" &&
    simulatorControls.active &&
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
            value={units.speedMps(telemetry.speedMps)}
          />
          <CockpitMetric
            label="Time"
            value={formatDuration(telemetry.elapsedSeconds)}
          />
          <CockpitMetric
            label="Distance"
            value={units.distance(telemetry.distanceMeters, {
              precision: 2,
              compactUnderKm: true,
            })}
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
                  onChange={(mode) => simulatorControls.setRiderPowerMode(mode)}
                />
                <Button
                  aria-label={riderState.paused ? "Resume ride" : "Pause ride"}
                  className="h-8"
                  size="icon-sm"
                  type="button"
                  variant={riderState.paused ? "default" : "secondary"}
                  onClick={() =>
                    simulatorControls.setRiderPaused(!riderState.paused)
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
                  onChange={simulatorControls.setManualPower}
                  step={5}
                  unit="W"
                  value={riderState.powerWatts}
                />
                <CockpitRangeControl
                  label="Cadence"
                  max={130}
                  min={40}
                  onChange={simulatorControls.setCadence}
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
                    void simulatorControls.setTrainerMode(mode)
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
                    void simulatorControls.setSimulationGrade(gradePercent)
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
                    void simulatorControls.setResistance(level)
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
                    void simulatorControls.setTargetPower(watts)
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
