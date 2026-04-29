import { useMemo } from "react"
import { BufferAttribute, BufferGeometry, DoubleSide } from "three"
import type { TerrainPatch } from "@ramp/ride-engine"

type RideTerrainProps = {
  patches: Array<TerrainPatch>
}

export function RideTerrain({ patches }: RideTerrainProps) {
  return (
    <group>
      {patches.map((patch) => (
        <TerrainPatchMesh key={patch.id} patch={patch} />
      ))}
    </group>
  )
}

function TerrainPatchMesh({ patch }: { patch: TerrainPatch }) {
  const geometry = useMemo(() => {
    const positions = patch.corners.flatMap(([x, y, z]) => [x, y - 0.03, z])
    const terrainGeometry = new BufferGeometry()
    terrainGeometry.setAttribute(
      "position",
      new BufferAttribute(new Float32Array(positions), 3)
    )
    terrainGeometry.setIndex([0, 1, 2, 0, 2, 3])
    terrainGeometry.computeVertexNormals()
    return terrainGeometry
  }, [patch])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial color={patch.color} roughness={0.95} side={DoubleSide} />
    </mesh>
  )
}
