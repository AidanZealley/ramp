import { useFrame, useThree } from "@react-three/fiber"
import { useLayoutEffect, useMemo } from "react"
import { Vector3 } from "three"
import type { Camera } from "three"
import { sampleRouteAtDistance } from "@ramp/ride-engine"
import { RIDE_WORLD } from "./ride-world-config"

type RideCameraProps = {
  distanceMeters: number
}

export function RideCamera({ distanceMeters }: RideCameraProps) {
  const camera = useThree((state) => state.camera)
  const target = useMemo(() => new Vector3(), [])
  const desiredPosition = useMemo(() => new Vector3(), [])

  useLayoutEffect(() => {
    setCameraTarget(camera, distanceMeters, target, desiredPosition, 1)
  }, [camera, desiredPosition, distanceMeters, target])

  useFrame((_, delta) => {
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
