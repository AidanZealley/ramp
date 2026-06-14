import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  Color,
  CylinderGeometry,
  MathUtils,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three"
import { FREE_RIDE_TARGETS } from "../../../../free-ride-config"
import type { RideState } from "../../../../ride-state"
import type { InstancedMesh } from "three"

const Y_AXIS = new Vector3(0, 1, 0)

type TargetDroneWakeProps = {
  rideState: RideState
}

export const TargetDroneWake = ({ rideState }: TargetDroneWakeProps) => {
  const streamRef = useRef<InstancedMesh>(null)
  const dustRef = useRef<InstancedMesh>(null)
  const streamGeometry = useMemo(
    () => new CylinderGeometry(0.01, 0.024, 1, 5),
    []
  )
  const dustGeometry = useMemo(() => new SphereGeometry(0.035, 5, 3), [])
  const streamMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.draftHudColor).multiplyScalar(1.55),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const dustMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color("#d9f7df").multiplyScalar(1.25),
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
      quaternion: new Quaternion(),
      direction: new Vector3(),
      streamSeeds: Array.from(
        { length: FREE_RIDE_TARGETS.draftWakeParticleCount },
        (_, index) => {
          const t = (index + 0.5) / FREE_RIDE_TARGETS.draftWakeParticleCount
          return {
            phase: t,
            side: Math.sin(index * 12.9898) * 0.5 + 0.5,
            lift: Math.sin(index * 78.233) * 0.5 + 0.5,
            lane: index % 11,
            speed: 0.24 + (index % 13) * 0.015,
            length: 0.9 + (index % 5) * 0.22,
          }
        }
      ),
      dustSeeds: Array.from(
        { length: FREE_RIDE_TARGETS.draftDustParticleCount },
        (_, index) => {
          const t = (index + 0.5) / FREE_RIDE_TARGETS.draftDustParticleCount
          return {
            phase: t,
            side: Math.sin(index * 41.17) * 0.5 + 0.5,
            lift: Math.sin(index * 17.41) * 0.5 + 0.5,
            speed: 0.15 + (index % 17) * 0.009,
            size: 0.16 + (index % 9) * 0.035,
          }
        }
      ),
    }),
    []
  )

  useFrame(({ clock }, delta) => {
    const stream = streamRef.current
    const dust = dustRef.current
    if (!stream || !dust) return

    const quality = rideState.targetDroneDraftQuality
    const targetOpacity =
      rideState.targetDroneAlive && rideState.targetDroneDraftLocked
        ? 0.08 + quality * 0.28
        : 0
    streamMaterial.opacity = MathUtils.damp(
      streamMaterial.opacity,
      targetOpacity,
      7,
      delta
    )
    dustMaterial.opacity = MathUtils.damp(
      dustMaterial.opacity,
      targetOpacity * 0.48,
      5,
      delta
    )

    const active = streamMaterial.opacity > 0.01 || dustMaterial.opacity > 0.01
    stream.visible = active
    dust.visible = active
    if (!active) return

    const time = clock.elapsedTime
    const length = FREE_RIDE_TARGETS.draftWakeLengthMeters
    const width =
      FREE_RIDE_TARGETS.draftWakeWidthMeters * (1 + (1 - quality) * 0.35)
    scratch.direction.set(0, 0, -1)
    scratch.quaternion.setFromUnitVectors(Y_AXIS, scratch.direction)

    scratch.streamSeeds.forEach((seed, index) => {
      const travel = (seed.phase + time * seed.speed) % 1
      const taper = 1 - travel
      const laneOffset = (seed.lane - 5) / 5
      const wobble = Math.sin(time * 7.5 + index * 1.7) * 0.08
      scratch.position.set(
        laneOffset * width * (0.13 + travel * 0.82) + wobble,
        (seed.lift - 0.5) * 0.42 * (0.4 + travel) +
          Math.sin(time * 6 + index) * 0.035,
        -FREE_RIDE_TARGETS.bodyLengthMeters * 0.62 - travel * length
      )
      scratch.scale.set(0.7 + taper * 0.7, seed.length, 0.7 + taper * 0.5)
      scratch.matrix.compose(
        scratch.position,
        scratch.quaternion,
        scratch.scale
      )
      stream.setMatrixAt(index, scratch.matrix)
    })
    stream.instanceMatrix.needsUpdate = true

    scratch.dustSeeds.forEach((seed, index) => {
      const travel = (seed.phase + time * seed.speed) % 1
      const eddy = Math.sin(time * 3.4 + index * 2.31)
      scratch.position.set(
        (seed.side - 0.5) * width * (0.22 + travel) + eddy * 0.12,
        (seed.lift - 0.5) * 0.82 * (0.4 + travel * 0.9),
        -FREE_RIDE_TARGETS.bodyLengthMeters * 0.68 - travel * length
      )
      scratch.scale.setScalar(seed.size * (0.55 + (1 - travel) * 0.7))
      scratch.matrix.compose(scratch.position, dust.quaternion, scratch.scale)
      dust.setMatrixAt(index, scratch.matrix)
    })
    dust.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <instancedMesh
        ref={streamRef}
        args={[
          streamGeometry,
          streamMaterial,
          FREE_RIDE_TARGETS.draftWakeParticleCount,
        ]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={dustRef}
        args={[
          dustGeometry,
          dustMaterial,
          FREE_RIDE_TARGETS.draftDustParticleCount,
        ]}
        frustumCulled={false}
      />
    </>
  )
}
