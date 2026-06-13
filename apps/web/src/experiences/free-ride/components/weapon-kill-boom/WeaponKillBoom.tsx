import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  Color,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from "three"
import { FREE_RIDE_TARGETS } from "../../free-ride-config"
import {
  createTrackSample,
  getVisualTrackY,
  sampleTrackInto,
} from "../../track"
import type { Group, Mesh } from "three"
import type { WeaponKillBoomProps } from "./types"

const PARTICLE_COUNT = FREE_RIDE_TARGETS.weaponKillBoomParticleCount
const Z_AXIS = new Vector3(0, 0, 1)

export const WeaponKillBoom = ({ rideState }: WeaponKillBoomProps) => {
  const groupRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const flashRef = useRef<Mesh>(null)
  const particlesRef = useRef<InstancedMesh>(null)

  const ringGeometry = useMemo(() => new TorusGeometry(1, 0.035, 8, 64), [])
  const flashGeometry = useMemo(() => new SphereGeometry(1, 18, 10), [])
  const particleGeometry = useMemo(() => new SphereGeometry(0.055, 6, 4), [])
  const ringMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponKillShockwaveColor).multiplyScalar(
          2.4
        ),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const flashMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponKillBoomColor).multiplyScalar(
          2.6
        ),
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
    []
  )
  const particleMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(FREE_RIDE_TARGETS.weaponKillBoomColor).multiplyScalar(
          2.1
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
      impact: new Vector3(),
      up: new Vector3(),
      direction: new Vector3(),
      position: new Vector3(),
      scale: new Vector3(),
      matrix: new Matrix4(),
      quaternion: new Quaternion(),
      particleQuaternion: new Quaternion(),
      sample: createTrackSample(),
      sequence: -1,
      seeds: Array.from({ length: PARTICLE_COUNT }, (_, index) => {
        const a = index * 2.399963229728653
        const z = 1 - ((index + 0.5) / PARTICLE_COUNT) * 2
        const r = Math.sqrt(Math.max(0, 1 - z * z))
        return {
          x: Math.cos(a) * r,
          y: z,
          z: Math.sin(a) * r,
          speed: 2.4 + (index % 9) * 0.22,
          size: 0.45 + ((index * 37) % 100) / 180,
        }
      }),
    }),
    []
  )

  useFrame(() => {
    const group = groupRef.current
    const ring = ringRef.current
    const flash = flashRef.current
    const particles = particlesRef.current
    if (!group || !ring || !flash || !particles) return

    const active = rideState.weaponKillBoomSecondsRemaining > 0
    group.visible = active
    if (!active) return

    if (scratch.sequence !== rideState.weaponKillSequence) {
      scratch.sequence = rideState.weaponKillSequence
      const sample = sampleTrackInto(
        rideState.weaponFireTargetDistance,
        scratch.sample
      )
      scratch.impact.set(
        sample.position[0] +
          sample.right[0] * rideState.weaponFireTargetLateralOffsetMeters,
        getVisualTrackY(sample) +
          sample.right[1] * rideState.weaponFireTargetLateralOffsetMeters,
        sample.position[2] +
          sample.right[2] * rideState.weaponFireTargetLateralOffsetMeters
      )
      scratch.up.set(sample.up[0], sample.up[1], sample.up[2])
      scratch.impact.addScaledVector(
        scratch.up,
        FREE_RIDE_TARGETS.hoverHeightMeters
      )
      scratch.quaternion.setFromUnitVectors(Z_AXIS, scratch.up)
      group.position.copy(scratch.impact)
      group.quaternion.copy(scratch.quaternion)
    }

    const total = FREE_RIDE_TARGETS.weaponKillBoomSeconds
    const progress = 1 - rideState.weaponKillBoomSecondsRemaining / total
    const clamped = Math.max(0, Math.min(1, progress))
    const fade = 1 - clamped

    ring.scale.setScalar(0.35 + clamped * 5.6)
    ringMaterial.opacity = fade * 0.62

    flash.scale.setScalar(1.4 + clamped * 1.9)
    flashMaterial.opacity = Math.max(0, fade * 0.78 - clamped * 0.12)

    particleMaterial.opacity = fade * 0.82
    scratch.seeds.forEach((seed, index) => {
      scratch.direction.set(seed.x, seed.y, seed.z).normalize()
      scratch.position.copy(scratch.direction).multiplyScalar(seed.speed * clamped)
      scratch.scale.setScalar(seed.size * (1 - clamped * 0.35))
      scratch.matrix.compose(
        scratch.position,
        scratch.particleQuaternion,
        scratch.scale
      )
      particles.setMatrixAt(index, scratch.matrix)
    })
    particles.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef} visible={false} frustumCulled={false}>
      <mesh
        ref={ringRef}
        geometry={ringGeometry}
        material={ringMaterial}
        frustumCulled={false}
      />
      <mesh
        ref={flashRef}
        geometry={flashGeometry}
        material={flashMaterial}
        frustumCulled={false}
      />
      <instancedMesh
        ref={particlesRef}
        args={[particleGeometry, particleMaterial, PARTICLE_COUNT]}
        frustumCulled={false}
      />
    </group>
  )
}
