import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Object3D,
} from "three"
import { FREE_RIDE_PALETTE, FREE_RIDE_TRACK } from "../../free-ride-config"
import { sampleTrack } from "../../track"
import { forEachSlot, slotCount } from "../../slots"
import type { InstancedMesh } from "three"
import type { RideState } from "../../ride-state"
import type { TrackSample } from "../../track"

type TrackEdgesProps = {
  rideState: RideState
}

const { segmentCount, segmentSpacingMeters, behindMeters, halfWidthMeters } =
  FREE_RIDE_TRACK

const RAIL_WIDTH = 0.45
const RAIL_LIFT = 0.07
const DASH_WINDOW = { spacing: 6, back: 12, ahead: 220 }

/** Place a vertex `lateral` across and `lift` above the banked surface. */
function edgeVertex(
  sample: TrackSample,
  lateral: number,
  lift: number,
  out: Float32Array,
  offset: number
): void {
  out[offset] = sample.position[0] + sample.right[0] * lateral + sample.up[0] * lift
  out[offset + 1] = sample.position[1] + sample.right[1] * lateral + sample.up[1] * lift
  out[offset + 2] = sample.position[2] + sample.right[2] * lateral + sample.up[2] * lift
}

function makeRailGeometry(positions: Float32Array): BufferGeometry {
  const geom = new BufferGeometry()
  geom.setAttribute("position", new BufferAttribute(positions, 3))
  const indices: Array<number> = []
  for (let i = 0; i < segmentCount - 1; i += 1) {
    const base = i * 2
    indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }
  geom.setIndex(indices)
  return geom
}

/**
 * Glowing neon edge rails plus a stream of centre dashes for a strong sense of
 * speed. Rails reuse the same allocation-free treadmill technique as the ribbon;
 * the dashes are pooled instances anchored to fixed world slots so they scroll
 * past without per-instance state. All materials are unlit + `toneMapped` off
 * with HDR colours so the bloom pass does the glowing.
 */
export function TrackEdges({ rideState }: TrackEdgesProps) {
  const leftPositions = useMemo(() => new Float32Array(segmentCount * 2 * 3), [])
  const rightPositions = useMemo(() => new Float32Array(segmentCount * 2 * 3), [])
  const leftGeometry = useMemo(() => makeRailGeometry(leftPositions), [leftPositions])
  const rightGeometry = useMemo(() => makeRailGeometry(rightPositions), [rightPositions])

  const dashCount = useMemo(() => slotCount(DASH_WINDOW), [])
  const dashGeometry = useMemo(() => new BoxGeometry(0.32, 0.05, 2.2), [])
  const dashColor = useMemo(
    () => new Color(FREE_RIDE_PALETTE.neonOrange).multiplyScalar(2.2),
    []
  )
  const dummy = useMemo(() => new Object3D(), [])
  const dashRef = useRef<InstancedMesh>(null)

  const leftColor = useMemo(
    () => new Color(FREE_RIDE_PALETTE.neonCyan).multiplyScalar(1.8),
    []
  )
  const rightColor = useMemo(
    () => new Color(FREE_RIDE_PALETTE.neonMagenta).multiplyScalar(1.8),
    []
  )

  useFrame(() => {
    const start = rideState.distance - behindMeters
    for (let i = 0; i < segmentCount; i += 1) {
      const sample = sampleTrack(start + i * segmentSpacingMeters)
      const offset = i * 6
      edgeVertex(sample, -halfWidthMeters, RAIL_LIFT, leftPositions, offset)
      edgeVertex(sample, -halfWidthMeters + RAIL_WIDTH, RAIL_LIFT, leftPositions, offset + 3)
      edgeVertex(sample, halfWidthMeters - RAIL_WIDTH, RAIL_LIFT, rightPositions, offset)
      edgeVertex(sample, halfWidthMeters, RAIL_LIFT, rightPositions, offset + 3)
    }
    leftGeometry.attributes.position.needsUpdate = true
    rightGeometry.attributes.position.needsUpdate = true

    const dashes = dashRef.current
    if (dashes) {
      forEachSlot(rideState.distance, DASH_WINDOW, (slotIndex, _k, distanceAlong) => {
        const sample = sampleTrack(distanceAlong)
        dummy.position.set(
          sample.position[0] + sample.up[0] * RAIL_LIFT,
          sample.position[1] + sample.up[1] * RAIL_LIFT,
          sample.position[2] + sample.up[2] * RAIL_LIFT
        )
        dummy.up.set(sample.up[0], sample.up[1], sample.up[2])
        dummy.lookAt(
          sample.position[0] + sample.tangent[0],
          sample.position[1] + sample.tangent[1],
          sample.position[2] + sample.tangent[2]
        )
        dummy.updateMatrix()
        dashes.setMatrixAt(slotIndex, dummy.matrix)
      })
      dashes.instanceMatrix.needsUpdate = true
    }
  })

  return (
    <group>
      <mesh geometry={leftGeometry} frustumCulled={false}>
        <meshBasicMaterial color={leftColor} toneMapped={false} side={DoubleSide} />
      </mesh>
      <mesh geometry={rightGeometry} frustumCulled={false}>
        <meshBasicMaterial color={rightColor} toneMapped={false} side={DoubleSide} />
      </mesh>
      <instancedMesh
        ref={dashRef}
        args={[dashGeometry, undefined, dashCount]}
        frustumCulled={false}
      >
        <meshBasicMaterial color={dashColor} toneMapped={false} />
      </instancedMesh>
    </group>
  )
}
