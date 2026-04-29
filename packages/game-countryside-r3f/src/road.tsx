import { useMemo } from "react"
import {
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  DoubleSide,
  Shape,
  Vector2,
  Vector3,
} from "three"
import type { RouteSample } from "./procgen/types"
import { ROAD_HALF_WIDTH_METERS } from "./world-config"

type RideRoadProps = {
  routeSamples: Array<RouteSample>
}

export function RideRoad({ routeSamples }: RideRoadProps) {
  const roadGeometry = useMemo(
    () => createRoadGeometry(routeSamples),
    [routeSamples]
  )
  const centerLine = useMemo(
    () =>
      new CatmullRomCurve3(
        routeSamples.map(
          (sample) =>
            new Vector3(
              sample.position[0],
              sample.position[1] + 0.08,
              sample.position[2]
            )
        )
      ),
    [routeSamples]
  )
  const markerGeometry = useMemo(() => {
    const shape = new Shape([
      new Vector2(-0.05, -1.8),
      new Vector2(0.05, -1.8),
      new Vector2(0.05, 1.8),
      new Vector2(-0.05, 1.8),
    ])
    return shape
  }, [])

  return (
    <group>
      <mesh geometry={roadGeometry} receiveShadow>
        <meshStandardMaterial color="#6f736d" roughness={0.88} side={DoubleSide} />
      </mesh>
      {centerLine.getPoints(18).map((point, index) => (
        <mesh
          key={`${point.z}-${index}`}
          position={[point.x, point.y + 0.02, point.z]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <shapeGeometry args={[markerGeometry]} />
          <meshStandardMaterial color="#e6e1ba" roughness={0.8} side={DoubleSide} />
        </mesh>
      ))}
    </group>
  )
}

function createRoadGeometry(routeSamples: Array<RouteSample>): BufferGeometry {
  const positions: number[] = []
  const indices: number[] = []

  routeSamples.forEach((sample) => {
    const left = offsetSample(sample, -ROAD_HALF_WIDTH_METERS)
    const right = offsetSample(sample, ROAD_HALF_WIDTH_METERS)
    positions.push(left.x, left.y + 0.06, left.z, right.x, right.y + 0.06, right.z)
  })

  for (let index = 0; index < routeSamples.length - 1; index += 1) {
    const base = index * 2
    indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function offsetSample(sample: RouteSample, offset: number): Vector3 {
  const tangent = new Vector3(
    sample.tangent[0],
    sample.tangent[1],
    sample.tangent[2]
  )
  const normal = new Vector3(-tangent.z, 0, tangent.x).normalize()
  return new Vector3(
    sample.position[0] + normal.x * offset,
    sample.position[1],
    sample.position[2] + normal.z * offset
  )
}
