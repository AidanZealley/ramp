import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { BufferAttribute, BufferGeometry, DoubleSide } from "three"
import { FREE_RIDE_PALETTE, FREE_RIDE_TRACK } from "../../free-ride-config"
import { offsetAlongRight, sampleTrack } from "../../track"
import type { RideState } from "../../ride-state"

type TrackRibbonProps = {
  rideState: RideState
}

const { segmentCount, segmentSpacingMeters, behindMeters, halfWidthMeters } =
  FREE_RIDE_TRACK

/**
 * The neon track surface as a seamless "treadmill". The geometry is allocated
 * once; every frame we re-sample the analytic track across a sliding window and
 * rewrite the existing vertex buffer in place — no allocation, no chunk
 * swapping, so the road never pops. The far end is well past the fog so it
 * fades out before it would ever be seen ending.
 */
export function TrackRibbon({ rideState }: TrackRibbonProps) {
  const positions = useMemo(
    () => new Float32Array(segmentCount * 2 * 3),
    []
  )

  const geometry = useMemo(() => {
    const geom = new BufferGeometry()
    geom.setAttribute("position", new BufferAttribute(positions, 3))

    const indices: Array<number> = []
    for (let i = 0; i < segmentCount - 1; i += 1) {
      const base = i * 2
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
    }
    geom.setIndex(indices)
    geom.computeVertexNormals()
    return geom
  }, [positions])

  const geometryRef = useRef(geometry)
  geometryRef.current = geometry

  useFrame(() => {
    const start = rideState.distance - behindMeters
    for (let i = 0; i < segmentCount; i += 1) {
      const sample = sampleTrack(start + i * segmentSpacingMeters)
      const left = offsetAlongRight(sample, -halfWidthMeters)
      const right = offsetAlongRight(sample, halfWidthMeters)
      const offset = i * 6
      positions[offset] = left[0]
      positions[offset + 1] = left[1]
      positions[offset + 2] = left[2]
      positions[offset + 3] = right[0]
      positions[offset + 4] = right[1]
      positions[offset + 5] = right[2]
    }
    geometry.attributes.position.needsUpdate = true
    geometry.computeVertexNormals()
  })

  return (
    <mesh geometry={geometry} frustumCulled={false}>
      <meshStandardMaterial
        color={FREE_RIDE_PALETTE.trackSurface}
        emissive={FREE_RIDE_PALETTE.trackUnderglow}
        emissiveIntensity={0.5}
        roughness={0.35}
        metalness={0.15}
        side={DoubleSide}
      />
    </mesh>
  )
}
