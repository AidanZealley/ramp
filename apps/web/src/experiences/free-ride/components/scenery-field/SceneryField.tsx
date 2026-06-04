import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { BoxGeometry, Color, MeshStandardMaterial, Object3D } from "three"
import {
  FREE_RIDE_CITY,
  FREE_RIDE_PALETTE,
  FREE_RIDE_SEED,
} from "../../free-ride-config"
import { getLowerWorldY, getVisualTrackY, sampleTrack } from "../../track"
import { forEachSlot, slotCount } from "../../slots"
import { hashInt, mulberry32 } from "../../rng"
import type { InstancedMesh } from "three"
import type { SlotWindow } from "../../slots"
import type { RideState } from "../../ride-state"

type SceneryFieldProps = {
  rideState: RideState
}

type CityLayerConfig = {
  window: SlotWindow
  saltSeed: number
  lateralMin: number
  lateralRange: number
  heightMin: number
  heightRange: number
  widthMin: number
  widthRange: number
  depthMin: number
  depthRange: number
  hiddenBelow: number
  yJitter: number
  emissiveIntensity: number
  farFade: number
}

const SEED = hashInt(0xc17c17, FREE_RIDE_SEED.length)

const NEAR: CityLayerConfig = {
  window: FREE_RIDE_CITY.nearWindow,
  saltSeed: 101,
  lateralMin: FREE_RIDE_CITY.nearLateralMinMeters,
  lateralRange: FREE_RIDE_CITY.nearLateralRangeMeters,
  heightMin: 18,
  heightRange: 88,
  widthMin: 4,
  widthRange: 14,
  depthMin: 5,
  depthRange: 18,
  hiddenBelow: 0.12,
  yJitter: 20,
  emissiveIntensity: 0.08,
  farFade: 1,
}

const FAR: CityLayerConfig = {
  window: FREE_RIDE_CITY.farWindow,
  saltSeed: 202,
  lateralMin: FREE_RIDE_CITY.farLateralMinMeters,
  lateralRange: FREE_RIDE_CITY.farLateralRangeMeters,
  heightMin: 30,
  heightRange: 160,
  widthMin: 10,
  widthRange: 42,
  depthMin: 12,
  depthRange: 58,
  hiddenBelow: 0.2,
  yJitter: 32,
  emissiveIntensity: 0.035,
  farFade: 0.58,
}

const MEGA: CityLayerConfig = {
  window: FREE_RIDE_CITY.megaWindow,
  saltSeed: 303,
  lateralMin: 55,
  lateralRange: 190,
  heightMin: 80,
  heightRange: 170,
  widthMin: 28,
  widthRange: 78,
  depthMin: 55,
  depthRange: 120,
  hiddenBelow: 0.48,
  yJitter: 16,
  emissiveIntensity: 0.025,
  farFade: 0.72,
}

/** Horizontal "right" of travel (ignores bank so buildings stand upright). */
function horizontalRight(tangent: readonly [number, number, number]): [number, number] {
  const x = tangent[2]
  const z = -tangent[0]
  const len = Math.hypot(x, z) || 1
  return [x / len, z / len]
}

function CityLayer({
  rideState,
  config,
}: {
  rideState: RideState
  config: CityLayerConfig
}) {
  const count = useMemo(() => slotCount(config.window), [config.window])
  const geometry = useMemo(() => {
    const geom = new BoxGeometry(1, 1, 1)
    geom.translate(0, 0.5, 0)
    return geom
  }, [])
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: FREE_RIDE_PALETTE.scenery,
        emissive: FREE_RIDE_PALETTE.sceneryRim,
        emissiveIntensity: config.emissiveIntensity,
        roughness: 0.78,
        metalness: 0.28,
      }),
    [config.emissiveIntensity]
  )
  const dummy = useMemo(() => new Object3D(), [])
  const color = useMemo(() => new Color(), [])
  const warmWindowColor = useMemo(() => new Color(FREE_RIDE_PALETTE.windowWarm), [])
  const meshRef = useRef<InstancedMesh>(null)

  useFrame(() => {
    const mesh = meshRef.current
    if (!mesh) return

    forEachSlot(rideState.distance, config.window, (slotIndex, k, distanceAlong) => {
      const rng = mulberry32(hashInt(k, SEED + config.saltSeed))
      if (rng() < config.hiddenBelow) {
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
      const depth = config.depthMin + rng() * config.depthRange
      const height = config.heightMin + rng() * config.heightRange
      const lowerWorldY = getLowerWorldY(sample)
      const maxTopY = getVisualTrackY(sample) - 18
      const baseY = Math.min(
        lowerWorldY - rng() * config.yJitter,
        maxTopY - height
      )
      const lit = rng() > 0.68

      dummy.position.set(
        sample.position[0] + rx * lateral,
        baseY,
        sample.position[2] + rz * lateral
      )
      dummy.rotation.set(0, rng() * Math.PI * 2, 0)
      dummy.scale.set(width, height, depth)
      dummy.updateMatrix()
      mesh.setMatrixAt(slotIndex, dummy.matrix)

      color
        .set(lit ? FREE_RIDE_PALETTE.windowCool : FREE_RIDE_PALETTE.scenery)
        .lerp(warmWindowColor, lit ? rng() * 0.35 : 0)
        .multiplyScalar((lit ? 0.9 + rng() * 0.5 : 0.42 + rng() * 0.2) * config.farFade)
      mesh.setColorAt(slotIndex, color)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  })

  return (
    <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
  )
}

export const SceneryField = ({ rideState }: SceneryFieldProps) => {
  return (
    <group>
      <CityLayer rideState={rideState} config={FAR} />
      <CityLayer rideState={rideState} config={MEGA} />
      <CityLayer rideState={rideState} config={NEAR} />
    </group>
  )
}
