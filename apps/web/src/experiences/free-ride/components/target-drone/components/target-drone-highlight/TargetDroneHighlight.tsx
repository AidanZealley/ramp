import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  BoxGeometry,
  Color,
  MathUtils,
  MeshBasicMaterial,
} from "three"
import { FREE_RIDE_TARGETS } from "../../../../free-ride-config"
import type { Mesh } from "three"
import type { RideState } from "../../../../ride-state"

type TargetDroneHighlightProps = {
  rideState: RideState
}

export const TargetDroneHighlight = ({
  rideState,
}: TargetDroneHighlightProps) => {
  const meshRef = useRef<Mesh>(null)
  const geometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.draftHudColor).multiplyScalar(
          FREE_RIDE_TARGETS.draftHighlightIntensity
        ),
        transparent: true,
        opacity: 0,
        wireframe: true,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const targetOpacity = rideState.targetDroneDraftLocked ? 0.46 : 0
    material.opacity = MathUtils.damp(
      material.opacity,
      targetOpacity,
      8,
      delta
    )

    const pulse = rideState.targetDroneDraftLocked
      ? 1 + Math.sin(clock.elapsedTime * 7) * 0.035
      : 1
    mesh.scale.setScalar(pulse)
    mesh.visible = material.opacity > 0.01
  })

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={material}
      scale={[
        FREE_RIDE_TARGETS.bodyWidthMeters * 1.42,
        FREE_RIDE_TARGETS.bodyHeightMeters * 2.15,
        FREE_RIDE_TARGETS.bodyLengthMeters * 1.18,
      ]}
      frustumCulled={false}
    />
  )
}
