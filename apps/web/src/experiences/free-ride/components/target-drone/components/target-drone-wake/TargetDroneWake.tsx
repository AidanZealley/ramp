import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  Color,
  InstancedMesh,
  MathUtils,
  Matrix4,
  MeshBasicMaterial,
  SphereGeometry,
  Vector3,
} from "three"
import { FREE_RIDE_TARGETS } from "../../../../free-ride-config"
import type { RideState } from "../../../../ride-state"

type TargetDroneWakeProps = {
  rideState: RideState
}

export const TargetDroneWake = ({ rideState }: TargetDroneWakeProps) => {
  const meshRef = useRef<InstancedMesh>(null)
  const geometry = useMemo(() => new SphereGeometry(0.045, 6, 4), [])
  const material = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.draftHudColor),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const scratch = useMemo(
    () => ({
      matrix: new Matrix4(),
      position: new Vector3(),
      scale: new Vector3(),
      seeds: Array.from(
        { length: FREE_RIDE_TARGETS.draftWakeParticleCount },
        (_, index) => {
          const t = (index + 0.5) / FREE_RIDE_TARGETS.draftWakeParticleCount
          return {
            phase: t,
            side: Math.sin(index * 12.9898) * 0.5 + 0.5,
            lift: Math.sin(index * 78.233) * 0.5 + 0.5,
            speed: 0.18 + (index % 7) * 0.018,
          }
        }
      ),
    }),
    []
  )

  useFrame(({ clock }, delta) => {
    const mesh = meshRef.current
    if (!mesh) return

    const quality = rideState.targetDroneDraftQuality
    const targetOpacity =
      rideState.targetDroneAlive && rideState.targetDroneDraftLocked
      ? 0.06 + quality * 0.18
      : 0
    material.opacity = MathUtils.damp(
      material.opacity,
      targetOpacity,
      7,
      delta
    )

    const active = material.opacity > 0.01
    mesh.visible = active
    if (!active) return

    const time = clock.elapsedTime
    const length = FREE_RIDE_TARGETS.draftWakeLengthMeters
    const width =
      FREE_RIDE_TARGETS.draftWakeWidthMeters * (1 + (1 - quality) * 0.35)

    scratch.seeds.forEach((seed, index) => {
      const travel = (seed.phase + time * seed.speed) % 1
      const taper = 1 - travel
      const wobble = Math.sin(time * 4.5 + index * 1.7) * 0.16
      scratch.position.set(
        (seed.side - 0.5) * width * (0.25 + travel) + wobble,
        (seed.lift - 0.5) * 0.55 * (0.35 + travel),
        -FREE_RIDE_TARGETS.bodyLengthMeters * 0.62 - travel * length
      )
      const size = 0.45 + taper * 0.8
      scratch.scale.setScalar(size)
      scratch.matrix.compose(
        scratch.position,
        mesh.quaternion,
        scratch.scale
      )
      mesh.setMatrixAt(index, scratch.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        geometry,
        material,
        FREE_RIDE_TARGETS.draftWakeParticleCount,
      ]}
      frustumCulled={false}
    />
  )
}
