import { motion } from "motion/react"
import { Gauge, Heart } from "lucide-react"
import {
  FREE_RIDE_PALETTE,
  FREE_RIDE_TARGETS,
} from "../../free-ride-config"
import { HudStat } from "./components/hud-stat"
import { DraftQualityMeter } from "./components/draft-quality-meter"
import { MetricPod } from "./components/metric-pod"
import { PowerGauge } from "./components/power-gauge"
import { WeaponChargeMeter } from "./components/weapon-charge-meter"
import { useFreeRideHudData } from "./use-free-ride-hud-data"
import type { FreeRideHudProps } from "./types"

const CADENCE_COLOR = FREE_RIDE_PALETTE.neonCyan
const HEART_RATE_COLOR = "#ff3b6b"

/**
 * Perspective transforms for the bottom cluster. The 3D feel comes from three
 * things tuned together: a back-tilt (`rotateX`) on the whole cluster, the side
 * pods pulled *forward* in Z (closer/larger) with an outward yaw + a touch of
 * skew to fake a vanishing point, and the central gauge pushed *back* in Z
 * (set behind the pods). Kept here so the look is tunable in one place.
 */
const HUD_TRANSFORM = {
  // Smaller = closer viewer = stronger, more dramatic foreshortening.
  perspective: 750,
  // Vanishing point low on screen so the cluster reads as a receding ground plane.
  perspectiveOrigin: "50% 92%",
  clusterRotateX: 26,
  // Left pod: pulled well forward, yawed out to the left, skewed toward centre.
  leftPod: "skewX(-5deg)",
  // Right pod: mirror.
  rightPod: "skewX(5deg)",
  // Central gauge: pushed back behind the pods.
  power: "translateZ(0px)",
} as const

/**
 * Sci-fi HUD overlaid on the Free Ride scene. A DOM + SVG layer positioned over
 * the canvas; the tilted, perspective-3D feel comes from a CSS `perspective` +
 * `rotateX` on the bottom gauge cluster, with the side pods skewed and pulled
 * forward in Z while the central gauge sits back. `pointer-events-none` so it
 * never intercepts canvas interaction.
 */
export const FreeRideHud = ({ session, rideState }: FreeRideHudProps) => {
  const data = useFreeRideHudData(session, rideState)

  return (
    <motion.div
      className="pointer-events-none absolute inset-0 text-white select-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {data.draftLocked ? (
        <>
          <div
            className="absolute inset-0"
            style={{
              boxShadow: `inset 0 0 70px ${FREE_RIDE_TARGETS.draftHudColor}4d`,
            }}
          />
          <motion.div
            aria-live="polite"
            className="font-heading absolute top-8 left-1/2 -translate-x-1/2 text-sm font-semibold tracking-[0.34em] sm:top-10 sm:text-base"
            style={{
              color: FREE_RIDE_TARGETS.draftHudColor,
              textShadow: `0 0 16px ${FREE_RIDE_TARGETS.draftHudColor}`,
            }}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{
              opacity: [0.72, 1, 0.72],
              scale: [0.98, 1.04, 0.98],
            }}
            transition={{
              duration: 1.1,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          >
            DRAFT LOCK
          </motion.div>
          <motion.div
            className="absolute top-16 left-1/2 -translate-x-1/2 sm:top-20"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <DraftQualityMeter
              quality={data.draftQuality}
              percent={data.draftQualityPercent}
              color={data.hudIntensityColor}
              segmentCount={FREE_RIDE_TARGETS.draftQualityHudSegmentCount}
            />
          </motion.div>
          <motion.div
            className="absolute top-28 left-1/2 -translate-x-1/2 sm:top-32"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <WeaponChargeMeter
              charge={data.weaponCharge}
              percent={data.weaponChargePercent}
              active={data.weaponChargeActive}
              color={FREE_RIDE_TARGETS.weaponChargeHudColor}
              segmentCount={FREE_RIDE_TARGETS.weaponChargeHudSegmentCount}
            />
          </motion.div>
        </>
      ) : null}

      {/* Top-left: elapsed time + distance. */}
      <div className="absolute top-8 left-6 flex flex-col gap-4 sm:top-18 sm:left-9">
        <HudStat label="Time" value={data.timeValue} />
        <HudStat label="Distance" value={data.distanceValue} />
      </div>

      {/* Top-right: track grade. */}
      <div className="absolute top-8 right-6 sm:top-18 sm:right-9">
        <HudStat
          label="Grade"
          value={`${data.gradeValue}%`}
          align="right"
          accent={FREE_RIDE_PALETTE.neonMagenta}
        />
      </div>

      {/* Bottom gauge cluster, tilted back into the scene. */}
      <div
        className="absolute inset-x-0 bottom-0 flex justify-center"
        style={{
          perspective: `${HUD_TRANSFORM.perspective}px`,
          perspectiveOrigin: HUD_TRANSFORM.perspectiveOrigin,
        }}
      >
        <motion.div
          className="flex items-center gap-[clamp(0.25rem,1.5vw,2rem)] pb-[clamp(1rem,4vh,3rem)]"
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "bottom center",
            filter: data.draftLocked
              ? `drop-shadow(0 0 20px ${data.hudIntensityColor})`
              : undefined,
          }}
          initial={{
            opacity: 0,
            rotateX: HUD_TRANSFORM.clusterRotateX + 16,
            y: 40,
          }}
          animate={{ opacity: 1, rotateX: HUD_TRANSFORM.clusterRotateX, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <div style={{ transform: HUD_TRANSFORM.leftPod }}>
            <MetricPod
              label="Cadence"
              value={data.cadenceRpm}
              unit="RPM"
              fill={data.cadenceFill}
              color={CADENCE_COLOR}
              icon={Gauge}
              side="left"
            />
          </div>

          <div style={{ transform: HUD_TRANSFORM.power }}>
            <PowerGauge
              powerWatts={data.powerWatts}
              fill={data.powerFill}
              color={data.powerColor}
              draftLocked={data.draftLocked}
              intensityColor={data.hudIntensityColor}
              overScale={data.overScale}
              speedValue={data.speedValue}
              speedUnit={data.speedUnit}
            />
          </div>

          <div style={{ transform: HUD_TRANSFORM.rightPod }}>
            <MetricPod
              label="Heart Rate"
              value={data.heartRateBpm}
              unit="BPM"
              fill={data.heartRateFill}
              color={HEART_RATE_COLOR}
              icon={Heart}
              side="right"
            />
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}
