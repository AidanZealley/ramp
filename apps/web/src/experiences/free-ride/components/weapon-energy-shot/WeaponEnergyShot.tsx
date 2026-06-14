import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  Color,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three"
import { FREE_RIDE_CAMERA, FREE_RIDE_TARGETS } from "../../free-ride-config"
import {
  createTrackSample,
  getVisualTrackY,
  sampleTrackInto,
} from "../../track"
import { getWeaponFireProgress } from "../../weapon-kill"
import type { Group, InstancedMesh, Mesh } from "three"
import type { WeaponEnergyShotProps } from "./types"

const Y_AXIS = new Vector3(0, 1, 0)

export const WeaponEnergyShot = ({ rideState }: WeaponEnergyShotProps) => {
  const groupRef = useRef<Group>(null)
  const beamRef = useRef<Mesh>(null)
  const coreRef = useRef<Mesh>(null)
  const muzzleRef = useRef<Mesh>(null)
  const impactRef = useRef<Mesh>(null)
  const arcRef = useRef<InstancedMesh>(null)
  const sparkRef = useRef<InstancedMesh>(null)

  const beamGeometry = useMemo(() => new ConeGeometry(0.18, 1, 10, 1, true), [])
  const coreGeometry = useMemo(() => new ConeGeometry(0.055, 1, 8, 1, true), [])
  const flashGeometry = useMemo(() => new SphereGeometry(1, 14, 8), [])
  const arcGeometry = useMemo(
    () => new CylinderGeometry(0.012, 0.018, 1, 5),
    []
  )
  const sparkGeometry = useMemo(() => new SphereGeometry(0.035, 5, 3), [])
  const beamMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponShotColor).multiplyScalar(2.6),
        transparent: true,
        opacity: 0.58,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const coreMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponShotCoreColor).multiplyScalar(
          2.2
        ),
        transparent: true,
        opacity: 0.86,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const impactMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponShotCoreColor).multiplyScalar(
          2.8
        ),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const arcMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color("#d8fbff").multiplyScalar(2.8),
        transparent: true,
        opacity: 0.74,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const sparkMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponShotColor).multiplyScalar(2.2),
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const scratch = useMemo(
    () => ({
      origin: new Vector3(),
      target: new Vector3(),
      tip: new Vector3(),
      mid: new Vector3(),
      direction: new Vector3(),
      side: new Vector3(),
      lift: new Vector3(),
      offset: new Vector3(),
      arcStart: new Vector3(),
      arcEnd: new Vector3(),
      sparkBase: new Vector3(),
      position: new Vector3(),
      scale: new Vector3(),
      quaternion: new Quaternion(),
      matrix: new Matrix4(),
      originSample: createTrackSample(),
      targetSample: createTrackSample(),
      sequence: -1,
      arcSeeds: Array.from(
        { length: FREE_RIDE_TARGETS.weaponShotArcCount },
        (_, index) => ({
          phase: index / FREE_RIDE_TARGETS.weaponShotArcCount,
          twist: index * 2.399963229728653,
          pulse: 0.55 + (index % 4) * 0.16,
        })
      ),
      sparkSeeds: Array.from(
        { length: FREE_RIDE_TARGETS.weaponShotSparkCount },
        (_, index) => ({
          phase: index / FREE_RIDE_TARGETS.weaponShotSparkCount,
          angle: index * 2.399963229728653,
          lift: Math.sin(index * 17.31),
          speed: 0.28 + (index % 11) * 0.035,
          size: 0.45 + (index % 7) * 0.08,
        })
      ),
    }),
    []
  )

  useFrame(({ clock }) => {
    const group = groupRef.current
    const beam = beamRef.current
    const core = coreRef.current
    const muzzle = muzzleRef.current
    const impact = impactRef.current
    const arcs = arcRef.current
    const sparks = sparkRef.current
    if (!group || !beam || !core || !muzzle || !impact || !arcs || !sparks) {
      return
    }

    group.visible = rideState.weaponFiring
    if (!rideState.weaponFiring) return

    if (scratch.sequence !== rideState.weaponFireSequence) {
      scratch.sequence = rideState.weaponFireSequence

      const originSample = sampleTrackInto(
        rideState.weaponFireOriginDistance,
        scratch.originSample
      )
      scratch.origin.set(
        originSample.position[0] +
          originSample.right[0] *
            FREE_RIDE_TARGETS.weaponShotOriginLateralMeters,
        getVisualTrackY(originSample) +
          originSample.right[1] *
            FREE_RIDE_TARGETS.weaponShotOriginLateralMeters,
        originSample.position[2] +
          originSample.right[2] *
            FREE_RIDE_TARGETS.weaponShotOriginLateralMeters
      )
      scratch.origin.addScaledVector(
        scratch.direction.set(
          originSample.up[0],
          originSample.up[1],
          originSample.up[2]
        ),
        FREE_RIDE_CAMERA.eyeHeightMeters +
          FREE_RIDE_TARGETS.weaponShotOriginLiftMeters
      )
    }

    const targetSample = sampleTrackInto(
      rideState.weaponFireTargetDistance,
      scratch.targetSample
    )
    scratch.target.set(
      targetSample.position[0] +
        targetSample.right[0] * rideState.weaponFireTargetLateralOffsetMeters,
      getVisualTrackY(targetSample) +
        targetSample.right[1] * rideState.weaponFireTargetLateralOffsetMeters,
      targetSample.position[2] +
        targetSample.right[2] * rideState.weaponFireTargetLateralOffsetMeters
    )
    scratch.target.addScaledVector(
      scratch.direction.set(
        targetSample.up[0],
        targetSample.up[1],
        targetSample.up[2]
      ),
      FREE_RIDE_TARGETS.hoverHeightMeters
    )

    const progress = getWeaponFireProgress({
      fireSecondsRemaining: rideState.weaponFireSecondsRemaining,
      fireSecondsTotal: FREE_RIDE_TARGETS.weaponFireSeconds,
    })
    scratch.tip.lerpVectors(scratch.origin, scratch.target, progress)
    scratch.direction.subVectors(scratch.tip, scratch.origin)
    const length = scratch.direction.length()
    if (length <= 0.001) return

    scratch.direction.normalize()
    scratch.quaternion.setFromUnitVectors(Y_AXIS, scratch.direction)
    scratch.mid.addVectors(scratch.origin, scratch.tip).multiplyScalar(0.5)

    scratch.scale.set(1, length, 1)
    scratch.matrix.compose(scratch.mid, scratch.quaternion, scratch.scale)
    beam.matrix.copy(scratch.matrix)
    core.matrix.copy(scratch.matrix)

    muzzle.position.copy(scratch.origin)
    muzzle.scale.setScalar(0.22 + Math.sin(progress * Math.PI) * 0.2)
    impact.position.copy(scratch.tip)
    const impactPulse = Math.max(0, (progress - 0.72) / 0.28)
    impact.scale.setScalar(0.15 + impactPulse * 0.75)
    impactMaterial.opacity = impactPulse * 0.82

    scratch.side.set(1, 0, 0).cross(scratch.direction)
    if (scratch.side.lengthSq() < 0.001) scratch.side.set(0, 0, 1)
    scratch.side.normalize()
    scratch.lift.crossVectors(scratch.direction, scratch.side).normalize()

    const time = clock.elapsedTime
    const crackle = 0.75 + Math.sin(time * 80 + progress * 24) * 0.25
    arcMaterial.opacity = crackle * (0.32 + progress * 0.5)
    scratch.arcSeeds.forEach((seed, index) => {
      const startT = Math.max(0, progress - 0.26 + seed.phase * 0.2)
      const endT = Math.min(progress, startT + 0.2 + seed.pulse * 0.08)
      const radius =
        0.15 +
        Math.sin(time * 36 + seed.twist + progress * 12) * 0.05 +
        seed.phase * 0.05
      scratch.offset
        .copy(scratch.side)
        .multiplyScalar(Math.cos(seed.twist + time * 24) * radius)
        .addScaledVector(
          scratch.lift,
          Math.sin(seed.twist * 1.7 + time * 31) * radius
        )
      scratch.arcStart
        .lerpVectors(scratch.origin, scratch.target, startT)
        .addScaledVector(scratch.offset, 0.55)
      scratch.arcEnd
        .lerpVectors(scratch.origin, scratch.target, endT)
        .add(scratch.offset)
      scratch.direction.subVectors(scratch.arcEnd, scratch.arcStart)
      const arcLength = scratch.direction.length()
      if (arcLength <= 0.001) return
      scratch.direction.normalize()
      scratch.quaternion.setFromUnitVectors(Y_AXIS, scratch.direction)
      scratch.mid
        .addVectors(scratch.arcStart, scratch.arcEnd)
        .multiplyScalar(0.5)
      scratch.scale.set(1, arcLength, 1)
      scratch.matrix.compose(scratch.mid, scratch.quaternion, scratch.scale)
      arcs.setMatrixAt(index, scratch.matrix)
    })
    arcs.instanceMatrix.needsUpdate = true

    scratch.direction.subVectors(scratch.tip, scratch.origin).normalize()
    sparkMaterial.opacity = 0.2 + impactPulse * 0.78
    scratch.sparkSeeds.forEach((seed, index) => {
      const burst = (seed.phase + time * seed.speed + progress * 0.55) % 1
      const sourceWeight = index % 3 === 0 ? 0.15 : 1
      scratch.sparkBase.lerpVectors(scratch.origin, scratch.tip, sourceWeight)
      scratch.offset
        .copy(scratch.side)
        .multiplyScalar(Math.cos(seed.angle) * burst * 0.75)
        .addScaledVector(scratch.lift, seed.lift * burst * 0.48)
        .addScaledVector(scratch.direction, -burst * 0.2)
      scratch.position.copy(scratch.sparkBase).add(scratch.offset)
      scratch.scale.setScalar(seed.size * (1 - burst * 0.42))
      scratch.matrix.compose(scratch.position, sparks.quaternion, scratch.scale)
      sparks.setMatrixAt(index, scratch.matrix)
    })
    sparks.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef} visible={false} frustumCulled={false}>
      <mesh
        ref={beamRef}
        geometry={beamGeometry}
        material={beamMaterial}
        matrixAutoUpdate={false}
        frustumCulled={false}
      />
      <mesh
        ref={coreRef}
        geometry={coreGeometry}
        material={coreMaterial}
        matrixAutoUpdate={false}
        frustumCulled={false}
      />
      <mesh
        ref={muzzleRef}
        geometry={flashGeometry}
        material={coreMaterial}
        frustumCulled={false}
      />
      <mesh
        ref={impactRef}
        geometry={flashGeometry}
        material={impactMaterial}
        frustumCulled={false}
      />
      <instancedMesh
        ref={arcRef}
        args={[arcGeometry, arcMaterial, FREE_RIDE_TARGETS.weaponShotArcCount]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={sparkRef}
        args={[
          sparkGeometry,
          sparkMaterial,
          FREE_RIDE_TARGETS.weaponShotSparkCount,
        ]}
        frustumCulled={false}
      />
    </group>
  )
}
