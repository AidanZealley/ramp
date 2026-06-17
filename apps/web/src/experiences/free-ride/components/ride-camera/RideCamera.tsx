import { useFrame, useThree } from "@react-three/fiber"
import { useMemo } from "react"
import { Vector3 } from "three"
import { FREE_RIDE_CAMERA, FREE_RIDE_MOTION } from "../../free-ride-config"
import {
  clamp,
  createTrackSample,
  getRacingLineOffset,
  getVisualTrackY,
  sampleTrackInto,
} from "../../track"
import { measureFreeRideSection } from "../../perf"
import { getGradeCameraBiasTarget, getYawDriftTarget } from "./utils"
import type { RideState } from "../../ride-state"
import type { PerspectiveCamera } from "three"

type RideCameraProps = {
  rideState: RideState
}

/**
 * First-person camera. Sits low over the (banked) track surface, looks down the
 * track ahead, rolls into turns, bobs subtly and widens its FOV with speed for
 * the sense of flight. No rider or vehicle mesh is ever rendered.
 */
export function RideCamera({ rideState }: RideCameraProps) {
  const camera = useThree((state) => state.camera) as PerspectiveCamera

  const scratch = useMemo(
    () => ({
      eye: new Vector3(),
      target: new Vector3(),
      hereRight: new Vector3(),
      aheadRight: new Vector3(),
      tangent: new Vector3(),
      up: new Vector3(),
      aheadSample: createTrackSample(),
      gradeEyeHeightBias: 0,
      gradeTargetHeightBias: 0,
      yawDrift: 0,
    }),
    []
  )

  useFrame((state, delta) => {
    measureFreeRideSection("camera", () => {
      const dt = Math.min(delta, 0.05)
      const { eye, target, hereRight, aheadRight, tangent, up } = scratch

      const here = rideState.trackSample
      const aheadDistance =
        rideState.distance + FREE_RIDE_CAMERA.lookAheadMeters
      const ahead = sampleTrackInto(aheadDistance, scratch.aheadSample)
      const hereOffset = getRacingLineOffset(rideState.distance)
      const aheadOffset = getRacingLineOffset(aheadDistance)
      const targetGradeBias = getGradeCameraBiasTarget(rideState.distance)
      const gradeBiasLerp =
        1 - Math.exp(-FREE_RIDE_CAMERA.gradeHeightBiasLerpRate * dt)
      const targetYawDrift = getYawDriftTarget({
        distance: rideState.distance,
        speed: rideState.speed,
        maxSpeed: FREE_RIDE_MOTION.maxSpeedMps,
      })
      const yawDriftLerp = 1 - Math.exp(-FREE_RIDE_CAMERA.yawDriftLerpRate * dt)

      scratch.gradeEyeHeightBias +=
        (targetGradeBias.eyeHeightMeters - scratch.gradeEyeHeightBias) *
        gradeBiasLerp
      scratch.gradeTargetHeightBias +=
        (targetGradeBias.targetHeightMeters - scratch.gradeTargetHeightBias) *
        gradeBiasLerp
      scratch.yawDrift += (targetYawDrift - scratch.yawDrift) * yawDriftLerp

      up.set(here.up[0], here.up[1], here.up[2])
      tangent.set(here.tangent[0], here.tangent[1], here.tangent[2])
      hereRight.set(here.right[0], here.right[1], here.right[2])
      aheadRight.set(ahead.right[0], ahead.right[1], ahead.right[2])

      // Lean a touch harder than the track itself.
      const extraRoll = here.bank * (FREE_RIDE_CAMERA.bankMultiplier - 1)
      up.applyAxisAngle(
        tangent,
        clamp(
          extraRoll,
          -FREE_RIDE_CAMERA.maxBankRad,
          FREE_RIDE_CAMERA.maxBankRad
        )
      )

      const bob =
        Math.sin(state.clock.elapsedTime * FREE_RIDE_CAMERA.bobFrequency) *
        FREE_RIDE_CAMERA.bobAmplitude

      eye.set(here.position[0], getVisualTrackY(here), here.position[2])
      eye.addScaledVector(hereRight, hereOffset)
      eye.addScaledVector(up, FREE_RIDE_CAMERA.eyeHeightMeters + bob)
      eye.y += scratch.gradeEyeHeightBias

      target.set(ahead.position[0], getVisualTrackY(ahead), ahead.position[2])
      target.addScaledVector(aheadRight, aheadOffset + scratch.yawDrift)
      target.addScaledVector(
        up,
        FREE_RIDE_CAMERA.eyeHeightMeters - FREE_RIDE_CAMERA.lookDownMeters
      )
      target.y += scratch.gradeTargetHeightBias

      const positionLerp = 1 - Math.exp(-FREE_RIDE_CAMERA.positionLerpRate * dt)
      const orientationLerp =
        1 - Math.exp(-FREE_RIDE_CAMERA.orientationLerpRate * dt)

      camera.position.lerp(eye, positionLerp)
      camera.up.lerp(up, orientationLerp).normalize()
      camera.lookAt(target)

      const speedRatio = clamp(
        rideState.speed / FREE_RIDE_MOTION.maxSpeedMps,
        0,
        1
      )
      const targetFov =
        FREE_RIDE_CAMERA.baseFov + FREE_RIDE_CAMERA.speedFovBoost * speedRatio
      if (Math.abs(camera.fov - targetFov) > 0.05) {
        camera.fov += (targetFov - camera.fov) * orientationLerp
        camera.updateProjectionMatrix()
      }
    })
  })

  return null
}
