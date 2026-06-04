import { useFrame } from "@react-three/fiber"
import { useMemo, useRef } from "react"
import { Color, Matrix4, TorusGeometry, Vector3 } from "three"
import {
  FREE_RIDE_CAMERA,
  FREE_RIDE_PALETTE,
  FREE_RIDE_SEED,
  FREE_RIDE_TRACK,
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

type FloatingStructuresProps = {
  rideState: RideState
}

const SEED = hashInt(0x71179, FREE_RIDE_SEED.length)
const WINDOW = { spacing: 115, back: 20, ahead: 480 }
const RING_PROBABILITY = 0.34

const NEON_CHOICES = [FREE_RIDE_PALETTE.neonCyan, FREE_RIDE_PALETTE.neonViolet]

/**
 * Neon rings the track flies straight through — the classic Redout gate look.
 * Pooled torus instances anchored to fixed world slots; each slot's ring (or
 * absence, size and colour) is derived deterministically from its index, so
 * they stream toward the camera and recycle with no pop. Per-instance HDR
 * colours feed the bloom pass.
 */
export function FloatingStructures({ rideState }: FloatingStructuresProps) {
  const count = useMemo(() => slotCount(WINDOW), [])
  const geometry = useMemo(() => new TorusGeometry(1, 0.05, 12, 36), [])
  const scratch = useMemo(
    () => ({
      matrix: new Matrix4(),
      hidden: new Matrix4().makeScale(0, 0, 0),
      right: new Vector3(),
      up: new Vector3(),
      tangent: new Vector3(),
      scale: new Vector3(),
      sample: createTrackSample(),
    }),
    []
  )
  const color = useMemo(() => new Color(), [])
  const meshRef = useRef<InstancedMesh>(null)
  const firstSlotRef = useRef<number | null>(null)

  useFrame(() => {
    measureFreeRideSection("floatingStructures", () => {
      const mesh = meshRef.current
      if (!mesh) return
      const first = firstSlotIndex(rideState.distance, WINDOW)
      if (firstSlotRef.current === first) return
      firstSlotRef.current = first

      const { matrix, hidden, right, up, tangent, scale, sample } = scratch
      forEachSlot(rideState.distance, WINDOW, (slotIndex, k, distanceAlong) => {
        const rng = mulberry32(hashInt(k, SEED))
        const present = rng() < RING_PROBABILITY
        if (!present) {
          mesh.setMatrixAt(slotIndex, hidden)
          return
        }

        sampleTrackInto(distanceAlong, sample)
        const radius = FREE_RIDE_TRACK.halfWidthMeters + 4 + rng() * 5

        // Map the torus' local frame onto the track: +X→right, +Y→up, +Z→tangent,
        // so the hole-axis (local +Z) faces down the track and the ring stands as a
        // gate the camera flies straight through.
        right.set(sample.right[0], sample.right[1], sample.right[2])
        up.set(sample.up[0], sample.up[1], sample.up[2])
        tangent.set(sample.tangent[0], sample.tangent[1], sample.tangent[2])
        matrix.makeBasis(right, up, tangent)
        matrix.scale(scale.setScalar(radius))
        matrix.setPosition(
          sample.position[0] + up.x * FREE_RIDE_CAMERA.eyeHeightMeters,
          getVisualTrackY(sample) + up.y * FREE_RIDE_CAMERA.eyeHeightMeters,
          sample.position[2] + up.z * FREE_RIDE_CAMERA.eyeHeightMeters
        )
        mesh.setMatrixAt(slotIndex, matrix)

        const choice = NEON_CHOICES[Math.floor(rng() * NEON_CHOICES.length)]
        color.set(choice).multiplyScalar(1.35)
        mesh.setColorAt(slotIndex, color)
      })
      mesh.instanceMatrix.needsUpdate = true
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
  })

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, undefined, count]}
      frustumCulled={false}
    >
      <meshBasicMaterial toneMapped={false} />
    </instancedMesh>
  )
}
