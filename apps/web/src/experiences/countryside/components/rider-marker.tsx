import { memo, useMemo, useRef } from "react"
import { useFrame } from "@react-three/fiber"
import { Vector3 } from "three"
import { sampleRouteAtDistance } from "../procgen/generate"
import { RIDE_WORLD } from "../world-config"
import type { MutableRefObject } from "react"
import type { RideFrameData } from "@ramp/ride-core"
import type { Group } from "three"

type RiderMarkerProps = {
  frameRef: MutableRefObject<RideFrameData | null>
}

export const RiderMarker = memo(function RiderMarker({
  frameRef,
}: RiderMarkerProps) {
  const groupRef = useRef<Group>(null)
  const tangent = useMemo(() => new Vector3(), [])

  useFrame(() => {
    if (!groupRef.current) return
    const distanceMeters = frameRef.current?.distanceMeters ?? 0
    const sample = sampleRouteAtDistance(RIDE_WORLD, distanceMeters)

    groupRef.current.position.set(
      sample.position[0],
      sample.position[1] + 0.22,
      sample.position[2]
    )

    tangent.set(sample.tangent[0], sample.tangent[1], sample.tangent[2])
    groupRef.current.rotation.set(0, Math.atan2(tangent.x, tangent.z), 0)
  })

  return (
    <group ref={groupRef}>
      <mesh castShadow position={[-0.6, 0.28, 0]}>
        <torusGeometry args={[0.32, 0.045, 6, 16]} />
        <meshStandardMaterial color="#17211c" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0.6, 0.28, 0]}>
        <torusGeometry args={[0.32, 0.045, 6, 16]} />
        <meshStandardMaterial color="#17211c" roughness={0.7} />
      </mesh>
      <mesh castShadow position={[0, 0.72, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[1.1, 0.08, 0.08]} />
        <meshStandardMaterial color="#e35f43" roughness={0.56} />
      </mesh>
      <mesh castShadow position={[0.08, 1.16, 0]}>
        <capsuleGeometry args={[0.18, 0.46, 4, 8]} />
        <meshStandardMaterial color="#204c70" roughness={0.72} />
      </mesh>
      <mesh castShadow position={[0.16, 1.55, 0]}>
        <sphereGeometry args={[0.16, 10, 8]} />
        <meshStandardMaterial color="#f0be8f" roughness={0.64} />
      </mesh>
    </group>
  )
})
