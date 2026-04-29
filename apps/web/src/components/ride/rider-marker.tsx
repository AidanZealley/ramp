import { useMemo } from "react"
import { Vector3 } from "three"
import { sampleRouteAtDistance } from "@ramp/ride-engine"
import { RIDE_WORLD } from "./ride-world-config"

type RiderMarkerProps = {
  distanceMeters: number
}

export function RiderMarker({ distanceMeters }: RiderMarkerProps) {
  const sample = sampleRouteAtDistance(RIDE_WORLD, distanceMeters)
  const yaw = useMemo(() => {
    const tangent = new Vector3(
      sample.tangent[0],
      sample.tangent[1],
      sample.tangent[2]
    )
    return Math.atan2(tangent.x, tangent.z)
  }, [sample.tangent])

  return (
    <group
      position={[sample.position[0], sample.position[1] + 0.22, sample.position[2]]}
      rotation={[0, yaw, 0]}
    >
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
}
