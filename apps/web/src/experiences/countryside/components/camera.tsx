import { useFrame, useThree } from "@react-three/fiber"
import { useLayoutEffect, useMemo } from "react"
import { Vector3 } from "three"
import { sampleRouteAtDistance } from "../procgen/generate"
import { RIDE_WORLD } from "../world-config"
import type { MutableRefObject } from "react"
import type { RideFrameData } from "@ramp/ride-core"
import type { Camera } from "three"

type RideCameraProps = {
  frameRef: MutableRefObject<RideFrameData | null>
}

export function RideCamera({ frameRef }: RideCameraProps) {
  const camera = useThree((state) => state.camera)
  const target = useMemo(() => new Vector3(), [])
  const desiredPosition = useMemo(() => new Vector3(), [])

  // Snap to initial position at mount
  useLayoutEffect(() => {
    setCameraTarget(
      camera,
      frameRef.current?.distanceMeters ?? 0,
      target,
      desiredPosition,
      1
    )
  }, [camera, desiredPosition, frameRef, target])

  useFrame((_, delta) => {
    const distanceMeters = frameRef.current?.distanceMeters ?? 0
    setCameraTarget(
      camera,
      distanceMeters,
      target,
      desiredPosition,
      Math.min(1, delta * 5)
    )
  })

  return null
}

function setCameraTarget(
  camera: Camera,
  distanceMeters: number,
  target: Vector3,
  desiredPosition: Vector3,
  lerpAmount: number
) {
  const sample = sampleRouteAtDistance(RIDE_WORLD, distanceMeters)
  target.set(sample.position[0], sample.position[1] + 1.4, sample.position[2])
  desiredPosition.set(
    sample.position[0] + 72,
    sample.position[1] + 58,
    sample.position[2] + 72
  )
  if (lerpAmount >= 1) {
    camera.position.copy(desiredPosition)
  } else {
    camera.position.lerp(desiredPosition, lerpAmount)
  }
  camera.lookAt(target)
  const projectionCamera = camera as Camera & {
    updateProjectionMatrix?: () => void
  }
  if (projectionCamera.updateProjectionMatrix) {
    projectionCamera.updateProjectionMatrix()
  }
}
