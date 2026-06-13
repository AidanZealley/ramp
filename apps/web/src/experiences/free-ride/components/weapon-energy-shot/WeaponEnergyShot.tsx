import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  Color,
  ConeGeometry,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from "three"
import {
  FREE_RIDE_CAMERA,
  FREE_RIDE_TARGETS,
} from "../../free-ride-config"
import {
  createTrackSample,
  getVisualTrackY,
  sampleTrackInto,
} from "../../track"
import { getWeaponFireProgress } from "../../weapon-kill"
import type { Group, Mesh } from "three"
import type { WeaponEnergyShotProps } from "./types"

const Y_AXIS = new Vector3(0, 1, 0)

export const WeaponEnergyShot = ({ rideState }: WeaponEnergyShotProps) => {
  const groupRef = useRef<Group>(null)
  const beamRef = useRef<Mesh>(null)
  const coreRef = useRef<Mesh>(null)
  const muzzleRef = useRef<Mesh>(null)
  const impactRef = useRef<Mesh>(null)

  const beamGeometry = useMemo(() => new ConeGeometry(0.18, 1, 10, 1, true), [])
  const coreGeometry = useMemo(() => new ConeGeometry(0.055, 1, 8, 1, true), [])
  const flashGeometry = useMemo(() => new SphereGeometry(1, 14, 8), [])
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
  const scratch = useMemo(
    () => ({
      origin: new Vector3(),
      target: new Vector3(),
      tip: new Vector3(),
      mid: new Vector3(),
      direction: new Vector3(),
      scale: new Vector3(),
      quaternion: new Quaternion(),
      matrix: new Matrix4(),
      originSample: createTrackSample(),
      targetSample: createTrackSample(),
      sequence: -1,
    }),
    []
  )

  useFrame(() => {
    const group = groupRef.current
    const beam = beamRef.current
    const core = coreRef.current
    const muzzle = muzzleRef.current
    const impact = impactRef.current
    if (!group || !beam || !core || !muzzle || !impact) return

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
          originSample.right[0] * FREE_RIDE_TARGETS.weaponShotOriginLateralMeters,
        getVisualTrackY(originSample) +
          originSample.right[1] * FREE_RIDE_TARGETS.weaponShotOriginLateralMeters,
        originSample.position[2] +
          originSample.right[2] * FREE_RIDE_TARGETS.weaponShotOriginLateralMeters
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
    </group>
  )
}
