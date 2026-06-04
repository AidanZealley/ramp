import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  BoxGeometry,
  Color,
  Matrix4,
  MeshStandardMaterial,
  Vector3,
} from "three"
import {
  FREE_RIDE_PALETTE,
  FREE_RIDE_SEED,
  FREE_RIDE_TRACK_SURFACE,
} from "../../free-ride-config"
import { measureFreeRideSection } from "../../perf"
import {
  createTrackSample,
  getVisualTrackY,
  sampleTrackInto,
} from "../../track"
import { firstSlotIndex, forEachSlot, slotCount } from "../../slots"
import { hashInt, mulberry32 } from "../../rng"
import type { InstancedMesh } from "three"
import type { RideState } from "../../ride-state"
import type { TrackSample } from "../../track"

type TrackEdgesProps = {
  rideState: RideState
}

const LIGHT_WINDOW = { spacing: 24, back: 20, ahead: 340 }
const PANEL_WINDOW = { spacing: 62, back: 30, ahead: 360 }
const SEED = hashInt(0x5a17ed, FREE_RIDE_SEED.length)

function setTrackMatrix(
  matrix: Matrix4,
  sample: TrackSample,
  lateral: number,
  lift: number,
  scale: Vector3,
  scratch: {
    right: Vector3
    up: Vector3
    tangent: Vector3
    position: Vector3
  }
): void {
  scratch.right.set(sample.right[0], sample.right[1], sample.right[2])
  scratch.up.set(sample.up[0], sample.up[1], sample.up[2])
  scratch.tangent.set(sample.tangent[0], sample.tangent[1], sample.tangent[2])
  scratch.position.set(
    sample.position[0] + sample.right[0] * lateral + sample.up[0] * lift,
    getVisualTrackY(sample) + sample.right[1] * lateral + sample.up[1] * lift,
    sample.position[2] + sample.right[2] * lateral + sample.up[2] * lift
  )
  matrix.makeBasis(scratch.right, scratch.up, scratch.tangent)
  matrix.scale(scale)
  matrix.setPosition(scratch.position)
}

export const TrackEdges = ({ rideState }: TrackEdgesProps) => {
  const lightSlotCount = useMemo(() => slotCount(LIGHT_WINDOW), [])
  const panelSlotCount = useMemo(() => slotCount(PANEL_WINDOW), [])
  const lightGeometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const panelGeometry = useMemo(() => new BoxGeometry(1, 1, 1), [])
  const lightMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: new Color(FREE_RIDE_PALETTE.neonCyan).multiplyScalar(1.2),
        emissive: new Color(FREE_RIDE_PALETTE.neonCyan).multiplyScalar(1.6),
        emissiveIntensity: 1,
        roughness: 0.25,
        metalness: 0.2,
        toneMapped: false,
      }),
    []
  )
  const panelMaterial = useMemo(
    () =>
      new MeshStandardMaterial({
        color: FREE_RIDE_PALETTE.trackWall,
        emissive: FREE_RIDE_PALETTE.trackUnderglow,
        emissiveIntensity: 0.18,
        roughness: 0.32,
        metalness: 0.38,
      }),
    []
  )
  const scratch = useMemo(
    () => ({
      matrix: new Matrix4(),
      lightScale: new Vector3(0.36, 0.12, 1.15),
      stripScale: new Vector3(0.12, 0.1, 2.9),
      blockScale: new Vector3(0.72, 0.22, 1.35),
      hidden: new Matrix4().makeScale(0, 0, 0),
      color: new Color(),
      right: new Vector3(),
      up: new Vector3(),
      tangent: new Vector3(),
      position: new Vector3(),
      sample: createTrackSample(),
    }),
    []
  )
  const lightRef = useRef<InstancedMesh>(null)
  const panelRef = useRef<InstancedMesh>(null)
  const firstLightSlotRef = useRef<number | null>(null)
  const firstPanelSlotRef = useRef<number | null>(null)

  useFrame(() => {
    measureFreeRideSection("trackEdges", () => {
      const {
        matrix,
        lightScale,
        stripScale,
        blockScale,
        hidden,
        color,
        sample,
      } = scratch

      const lights = lightRef.current
      if (lights) {
        const first = firstSlotIndex(rideState.distance, LIGHT_WINDOW)
        if (firstLightSlotRef.current !== first) {
          firstLightSlotRef.current = first
          forEachSlot(
            rideState.distance,
            LIGHT_WINDOW,
            (slotIndex, k, distanceAlong) => {
              const rng = mulberry32(hashInt(k, SEED))
              const lateralBase =
                FREE_RIDE_TRACK_SURFACE.shoulderOuterMeters - 0.34
              const lift = 0.09 + rng() * 0.04
              for (const side of [-1, 1] as const) {
                const instanceIndex = slotIndex * 2 + (side < 0 ? 0 : 1)
                sampleTrackInto(distanceAlong + rng() * 4, sample)
                setTrackMatrix(
                  matrix,
                  sample,
                  lateralBase * side,
                  lift,
                  lightScale,
                  scratch
                )
                lights.setMatrixAt(instanceIndex, matrix)
                color
                  .set(
                    rng() < 0.78
                      ? FREE_RIDE_PALETTE.neonCyan
                      : FREE_RIDE_PALETTE.neonViolet
                  )
                  .multiplyScalar(1.3 + rng() * 0.6)
                lights.setColorAt(instanceIndex, color)
              }
            }
          )
          lights.instanceMatrix.needsUpdate = true
          if (lights.instanceColor) lights.instanceColor.needsUpdate = true
        }
      }

      const panels = panelRef.current
      if (panels) {
        const first = firstSlotIndex(rideState.distance, PANEL_WINDOW)
        if (firstPanelSlotRef.current !== first) {
          firstPanelSlotRef.current = first
          forEachSlot(
            rideState.distance,
            PANEL_WINDOW,
            (slotIndex, k, distanceAlong) => {
              const rng = mulberry32(hashInt(k, SEED + 909))
              sampleTrackInto(distanceAlong + rng() * 12, sample)
              for (const side of [-1, 1] as const) {
                const instanceIndex = slotIndex * 2 + (side < 0 ? 0 : 1)
                if (rng() < 0.22) {
                  panels.setMatrixAt(instanceIndex, hidden)
                  continue
                }
                const lateral =
                  side * (FREE_RIDE_TRACK_SURFACE.wallOuterMeters - 0.22)
                const lift = 0.22 + rng() * 0.1
                setTrackMatrix(
                  matrix,
                  sample,
                  lateral,
                  lift,
                  rng() < 0.65 ? stripScale : blockScale,
                  scratch
                )
                panels.setMatrixAt(instanceIndex, matrix)
              }
            }
          )
          panels.instanceMatrix.needsUpdate = true
        }
      }
    })
  })

  return (
    <group>
      <instancedMesh
        ref={lightRef}
        args={[lightGeometry, lightMaterial, lightSlotCount * 2]}
        frustumCulled={false}
      />
      <instancedMesh
        ref={panelRef}
        args={[panelGeometry, panelMaterial, panelSlotCount * 2]}
        frustumCulled={false}
      />
    </group>
  )
}
