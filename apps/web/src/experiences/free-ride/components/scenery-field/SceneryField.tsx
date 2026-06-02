import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { ConeGeometry, Object3D } from "three"
import { FREE_RIDE_PALETTE, FREE_RIDE_SEED } from "../../free-ride-config"
import { sampleTrack } from "../../track"
import { forEachSlot, slotCount } from "../../slots"
import { hashInt, mulberry32 } from "../../rng"
import type { InstancedMesh } from "three"
import type { SlotWindow } from "../../slots"
import type { RideState } from "../../ride-state"

type SceneryFieldProps = {
  rideState: RideState
}

const SEED = hashInt(0xc0ffee, FREE_RIDE_SEED.length)

type LayerConfig = {
  window: SlotWindow
  saltSeed: number
  lateralMin: number
  lateralRange: number
  heightMin: number
  heightRange: number
  widthMin: number
  widthRange: number
  hideBelow: number
  emissiveIntensity: number
}

const NEAR: LayerConfig = {
  window: { spacing: 14, back: 30, ahead: 300 },
  saltSeed: 101,
  lateralMin: 12,
  lateralRange: 40,
  heightMin: 8,
  heightRange: 26,
  widthMin: 2,
  widthRange: 5,
  hideBelow: 0.25,
  emissiveIntensity: 0.28,
}

const FAR: LayerConfig = {
  window: { spacing: 42, back: 40, ahead: 480 },
  saltSeed: 202,
  lateralMin: 90,
  lateralRange: 150,
  heightMin: 30,
  heightRange: 90,
  widthMin: 20,
  widthRange: 50,
  hideBelow: 0.15,
  emissiveIntensity: 0.12,
}

/** Horizontal "right" of travel (ignores bank so monoliths stand upright). */
function horizontalRight(tangent: readonly [number, number, number]): [number, number] {
  const x = tangent[2]
  const z = -tangent[0]
  const len = Math.hypot(x, z) || 1
  return [x / len, z / len]
}

function SceneryLayer({
  rideState,
  config,
}: {
  rideState: RideState
  config: LayerConfig
}) {
  const count = useMemo(() => slotCount(config.window), [config.window])
  // Cone with its base translated to y=0 so it rises from the ground.
  const geometry = useMemo(() => {
    const geom = new ConeGeometry(1, 1, 5)
    geom.translate(0, 0.5, 0)
    return geom
  }, [])
  const dummy = useMemo(() => new Object3D(), [])
  const meshRef = useRef<InstancedMesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return
    forEachSlot(rideState.distance, config.window, (slotIndex, k, distanceAlong) => {
      const rng = mulberry32(hashInt(k, SEED + config.saltSeed))
      const visible = rng() >= config.hideBelow
      if (!visible) {
        dummy.scale.set(0, 0, 0)
        dummy.position.set(0, -9999, 0)
        dummy.updateMatrix()
        mesh.setMatrixAt(slotIndex, dummy.matrix)
        return
      }

      const sample = sampleTrack(distanceAlong)
      const side = rng() < 0.5 ? -1 : 1
      const lateral = (config.lateralMin + rng() * config.lateralRange) * side
      const [rx, rz] = horizontalRight(sample.tangent)
      const width = config.widthMin + rng() * config.widthRange
      const height = config.heightMin + rng() * config.heightRange

      dummy.position.set(
        sample.position[0] + rx * lateral,
        sample.position[1] - 2,
        sample.position[2] + rz * lateral
      )
      dummy.rotation.set(0, rng() * Math.PI * 2, 0)
      dummy.scale.set(width, height, width)
      dummy.updateMatrix()
      mesh.setMatrixAt(slotIndex, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, count]} frustumCulled={false}>
      <meshStandardMaterial
        color={FREE_RIDE_PALETTE.scenery}
        emissive={FREE_RIDE_PALETTE.sceneryRim}
        emissiveIntensity={config.emissiveIntensity}
        roughness={0.7}
        metalness={0.1}
      />
    </instancedMesh>
  )
}

/** Jagged neon-rimmed monoliths flanking the track, near and far. */
export function SceneryField({ rideState }: SceneryFieldProps) {
  return (
    <group>
      <SceneryLayer rideState={rideState} config={NEAR} />
      <SceneryLayer rideState={rideState} config={FAR} />
    </group>
  )
}
