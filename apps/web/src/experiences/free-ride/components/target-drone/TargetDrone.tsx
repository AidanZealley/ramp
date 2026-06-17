import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  BoxGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  TorusGeometry,
  Vector3,
} from "three"
import { FREE_RIDE_PALETTE, FREE_RIDE_TARGETS } from "../../free-ride-config"
import {
  createTrackSample,
  getVisualTrackY,
  sampleTrackInto,
} from "../../track"
import { TargetDroneHighlight } from "./components/target-drone-highlight"
import { TargetDroneWake } from "./components/target-drone-wake"
import type { Group } from "three"
import type { RideState } from "../../ride-state"

type TargetDroneProps = {
  rideState: RideState
}

export const TargetDrone = ({ rideState }: TargetDroneProps) => {
  const groupRef = useRef<Group>(null)
  const bodyGeometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const noseGeometry = useMemo(() => new ConeGeometry(0.42, 0.9, 4), [])
  const rotorRingGeometry = useMemo(
    () => new TorusGeometry(0.28, 0.025, 8, 28),
    []
  )
  const rotorCoreGeometry = useMemo(
    () => new CylinderGeometry(0.08, 0.1, 0.08, 12),
    []
  )
  const rotorBladeGeometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const bodyMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#141824",
        emissive: FREE_RIDE_PALETTE.neonViolet,
        emissiveIntensity: 0.32,
        metalness: 0.55,
        roughness: 0.2,
      }),
    []
  )
  const cyanGlowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_PALETTE.neonCyan).multiplyScalar(
          FREE_RIDE_TARGETS.glowIntensity
        ),
        toneMapped: false,
      }),
    []
  )
  const magentaGlowMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_PALETTE.neonMagenta).multiplyScalar(
          FREE_RIDE_TARGETS.glowIntensity
        ),
        toneMapped: false,
      }),
    []
  )
  const hotCoreMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponShotCoreColor).multiplyScalar(
          1.8
        ),
        transparent: true,
        opacity: 0.92,
        toneMapped: false,
      }),
    []
  )
  const scratch = useMemo(
    () => ({
      matrix: new Matrix4(),
      right: new Vector3(),
      up: new Vector3(),
      tangent: new Vector3(),
      position: new Vector3(),
      scale: new Vector3(
        FREE_RIDE_TARGETS.visualScale,
        FREE_RIDE_TARGETS.visualScale,
        FREE_RIDE_TARGETS.visualScale
      ),
      sample: createTrackSample(),
    }),
    []
  )

  useFrame(() => {
    const group = groupRef.current
    const actor = rideState.targetDrone
    if (!group) return
    group.visible = actor.visible
    if (!actor.visible) return

    const sample = sampleTrackInto(actor.distance, scratch.sample)
    scratch.right.set(sample.right[0], sample.right[1], sample.right[2])
    scratch.up.set(sample.up[0], sample.up[1], sample.up[2])
    scratch.tangent.set(sample.tangent[0], sample.tangent[1], sample.tangent[2])
    scratch.position.set(
      sample.position[0] + sample.right[0] * actor.lateralOffsetMeters,
      getVisualTrackY(sample) + sample.right[1] * actor.lateralOffsetMeters,
      sample.position[2] + sample.right[2] * actor.lateralOffsetMeters
    )
    scratch.position.addScaledVector(
      scratch.up,
      FREE_RIDE_TARGETS.hoverHeightMeters
    )

    scratch.matrix.makeBasis(scratch.right, scratch.up, scratch.tangent)
    scratch.matrix.scale(scratch.scale)
    scratch.matrix.setPosition(scratch.position)
    group.matrix.copy(scratch.matrix)
  })

  const { bodyLengthMeters, bodyWidthMeters, bodyHeightMeters } =
    FREE_RIDE_TARGETS

  return (
    <group ref={groupRef} matrixAutoUpdate={false} frustumCulled={false}>
      <TargetDroneWake rideState={rideState} />
      <TargetDroneHighlight rideState={rideState} />
      <mesh
        geometry={bodyGeometry}
        material={bodyMaterial}
        scale={[bodyWidthMeters, bodyHeightMeters, bodyLengthMeters]}
        frustumCulled={false}
      />
      <mesh
        geometry={noseGeometry}
        material={bodyMaterial}
        rotation={[Math.PI / 2, Math.PI / 4, 0]}
        position={[0, 0.02, bodyLengthMeters * 0.57]}
        scale={[0.75, 0.75, 1]}
        frustumCulled={false}
      />
      <mesh
        geometry={bodyGeometry}
        material={cyanGlowMaterial}
        position={[0, bodyHeightMeters * 0.58, bodyLengthMeters * 0.08]}
        scale={[bodyWidthMeters * 0.45, 0.08, bodyLengthMeters * 0.72]}
        frustumCulled={false}
      />
      <mesh
        geometry={bodyGeometry}
        material={magentaGlowMaterial}
        position={[0, -bodyHeightMeters * 0.58, -bodyLengthMeters * 0.12]}
        scale={[bodyWidthMeters * 0.36, 0.06, bodyLengthMeters * 0.62]}
        frustumCulled={false}
      />
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[side * bodyWidthMeters * 0.78, -0.06, 0]}>
          <mesh
            geometry={bodyGeometry}
            material={bodyMaterial}
            scale={[0.16, 0.18, bodyLengthMeters * 0.78]}
            frustumCulled={false}
          />
          <mesh
            geometry={bodyGeometry}
            material={cyanGlowMaterial}
            position={[0, -0.14, 0]}
            scale={[0.08, 0.06, bodyLengthMeters * 0.9]}
            frustumCulled={false}
          />
        </group>
      ))}
      {([-1, 1] as const).flatMap((side) =>
        ([-1, 1] as const).map((end) => (
          <group
            key={`${side}-${end}`}
            position={[
              side * bodyWidthMeters * 1.05,
              -0.03,
              end * bodyLengthMeters * 0.34,
            ]}
          >
            <mesh
              geometry={bodyGeometry}
              material={bodyMaterial}
              position={[-side * bodyWidthMeters * 0.28, 0, 0]}
              scale={[bodyWidthMeters * 0.56, 0.08, 0.08]}
              frustumCulled={false}
            />
            <mesh
              geometry={rotorRingGeometry}
              material={cyanGlowMaterial}
              rotation={[Math.PI / 2, 0, 0]}
              frustumCulled={false}
            />
            <mesh
              geometry={rotorCoreGeometry}
              material={bodyMaterial}
              frustumCulled={false}
            />
            <mesh
              geometry={rotorBladeGeometry}
              material={hotCoreMaterial}
              rotation={[0, end * Math.PI * 0.18, 0]}
              scale={[0.46, 0.018, 0.055]}
              frustumCulled={false}
            />
            <mesh
              geometry={rotorBladeGeometry}
              material={hotCoreMaterial}
              rotation={[0, Math.PI / 2 + end * Math.PI * 0.18, 0]}
              scale={[0.46, 0.018, 0.055]}
              frustumCulled={false}
            />
          </group>
        ))
      )}
    </group>
  )
}
