import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  Color,
  CylinderGeometry,
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
import type { Group, InstancedMesh, Mesh } from "three"
import type { WeaponKillBoomProps } from "./types"

const PARTICLE_COUNT = FREE_RIDE_TARGETS.weaponKillBoomParticleCount
const SHARD_COUNT = FREE_RIDE_TARGETS.weaponKillBoomShardCount
const Y_AXIS = new Vector3(0, 1, 0)
const Z_AXIS = new Vector3(0, 0, 1)

export const WeaponKillBoom = ({ rideState }: WeaponKillBoomProps) => {
  const groupRef = useRef<Group>(null)
  const ringRef = useRef<Mesh>(null)
  const innerRingRef = useRef<Mesh>(null)
  const flashRef = useRef<Mesh>(null)
  const particlesRef = useRef<InstancedMesh>(null)
  const shardsRef = useRef<InstancedMesh>(null)

  const ringGeometry = useMemo(() => new TorusGeometry(1, 0.035, 8, 64), [])
  const innerRingGeometry = useMemo(
    () => new TorusGeometry(1, 0.022, 6, 48),
    []
  )
  const flashGeometry = useMemo(() => new SphereGeometry(1, 18, 10), [])
  const particleGeometry = useMemo(() => new SphereGeometry(0.055, 6, 4), [])
  const shardGeometry = useMemo(
    () => new CylinderGeometry(0.018, 0.035, 1, 5),
    []
  )
  const ringMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(
          FREE_RIDE_TARGETS.weaponKillShockwaveColor
        ).multiplyScalar(2.4),
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
  const innerRingMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color("#ffffff").multiplyScalar(2.9),
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
  const shardMaterial = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(
          FREE_RIDE_TARGETS.weaponKillShockwaveColor
        ).multiplyScalar(2.5),
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
      shardSeeds: Array.from({ length: SHARD_COUNT }, (_, index) => {
        const a = index * 2.399963229728653
        const lift = Math.sin(index * 19.191) * 0.55
        const radius = 0.72 + ((index * 29) % 100) / 180
        return {
          x: Math.cos(a) * radius,
          y: lift,
          z: Math.sin(a) * radius,
          speed: 3.6 + (index % 13) * 0.22,
          length: 0.55 + (index % 6) * 0.13,
        }
      }),
    }),
    []
  )

  useFrame(() => {
    const group = groupRef.current
    const ring = ringRef.current
    const innerRing = innerRingRef.current
    const flash = flashRef.current
    const particles = particlesRef.current
    const shards = shardsRef.current
    if (!group || !ring || !innerRing || !flash || !particles || !shards) return

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

    ring.scale.setScalar(0.35 + clamped * 7.2)
    ringMaterial.opacity = fade * 0.78

    innerRing.scale.setScalar(0.18 + clamped * 3.9)
    innerRing.rotation.z = clamped * Math.PI * 0.35
    innerRingMaterial.opacity = Math.max(0, 0.9 - clamped * 1.25)

    flash.scale.setScalar(1.8 + clamped * 2.8)
    flashMaterial.opacity = Math.max(0, fade * 0.95 - clamped * 0.08)

    particleMaterial.opacity = fade * 0.94
    scratch.seeds.forEach((seed, index) => {
      scratch.direction.set(seed.x, seed.y, seed.z).normalize()
      scratch.position
        .copy(scratch.direction)
        .multiplyScalar(seed.speed * clamped * (1 + clamped * 0.55))
      scratch.scale.setScalar(seed.size * (1.1 - clamped * 0.38))
      scratch.matrix.compose(
        scratch.position,
        scratch.particleQuaternion,
        scratch.scale
      )
      particles.setMatrixAt(index, scratch.matrix)
    })
    particles.instanceMatrix.needsUpdate = true

    shardMaterial.opacity = Math.max(0, fade * 0.9 - clamped * 0.08)
    scratch.shardSeeds.forEach((seed, index) => {
      scratch.direction.set(seed.x, seed.y, seed.z).normalize()
      scratch.position
        .copy(scratch.direction)
        .multiplyScalar(seed.speed * clamped * (0.35 + clamped))
      scratch.quaternion.setFromUnitVectors(Y_AXIS, scratch.direction)
      scratch.scale.set(1, seed.length * (1 - clamped * 0.28), 1)
      scratch.matrix.compose(
        scratch.position,
        scratch.quaternion,
        scratch.scale
      )
      shards.setMatrixAt(index, scratch.matrix)
    })
    shards.instanceMatrix.needsUpdate = true
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
        ref={innerRingRef}
        geometry={innerRingGeometry}
        material={innerRingMaterial}
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
      <instancedMesh
        ref={shardsRef}
        args={[shardGeometry, shardMaterial, SHARD_COUNT]}
        frustumCulled={false}
      />
    </group>
  )
}
