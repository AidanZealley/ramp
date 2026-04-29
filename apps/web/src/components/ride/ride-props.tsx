import { useLayoutEffect, useMemo, useRef } from "react"
import { DoubleSide, Matrix4, Quaternion, Vector3 } from "three"
import type { InstancedMesh } from "three"
import type { WorldProp } from "@ramp/ride-engine"

type RidePropsProps = {
  props: Array<WorldProp>
}

export function RideProps({ props }: RidePropsProps) {
  const trees = props.filter((prop) => prop.kind === "tree")
  const rocks = props.filter((prop) => prop.kind === "rock")
  const simpleProps = props.filter(
    (prop) => prop.kind !== "tree" && prop.kind !== "rock"
  )

  return (
    <group>
      <InstancedTrees props={trees} />
      <InstancedRocks props={rocks} />
      {simpleProps.map((prop) => (
        <SimpleProp key={prop.id} prop={prop} />
      ))}
    </group>
  )
}

function InstancedTrees({ props }: { props: Array<WorldProp> }) {
  const trunkRef = useRef<InstancedMesh>(null)
  const canopyRef = useRef<InstancedMesh>(null)

  useInstanceMatrices(props, trunkRef, (prop) => ({
    position: [prop.position[0], prop.position[1] + 0.75 * prop.scale, prop.position[2]],
    scale: [0.28 * prop.scale, 1.5 * prop.scale, 0.28 * prop.scale],
  }))
  useInstanceMatrices(props, canopyRef, (prop) => ({
    position: [prop.position[0], prop.position[1] + 2.0 * prop.scale, prop.position[2]],
    scale: [1.4 * prop.scale, 1.8 * prop.scale, 1.4 * prop.scale],
  }))

  if (props.length === 0) return null

  return (
    <group>
      <instancedMesh castShadow ref={trunkRef} args={[undefined, undefined, props.length]}>
        <cylinderGeometry args={[1, 1, 1, 6]} />
        <meshStandardMaterial color="#6b4d35" roughness={0.9} />
      </instancedMesh>
      <instancedMesh castShadow ref={canopyRef} args={[undefined, undefined, props.length]}>
        <coneGeometry args={[1, 1, 6]} />
        <meshStandardMaterial color="#315f38" roughness={0.86} />
      </instancedMesh>
    </group>
  )
}

function InstancedRocks({ props }: { props: Array<WorldProp> }) {
  const ref = useRef<InstancedMesh>(null)
  useInstanceMatrices(props, ref, (prop) => ({
    position: [prop.position[0], prop.position[1] + 0.22 * prop.scale, prop.position[2]],
    scale: [0.7 * prop.scale, 0.42 * prop.scale, 0.55 * prop.scale],
  }))

  if (props.length === 0) return null

  return (
    <instancedMesh castShadow ref={ref} args={[undefined, undefined, props.length]}>
      <dodecahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#7d8179" roughness={0.92} />
    </instancedMesh>
  )
}

function SimpleProp({ prop }: { prop: WorldProp }) {
  const position: [number, number, number] = [
    prop.position[0],
    prop.position[1],
    prop.position[2],
  ]

  if (prop.kind === "fence") {
    return (
      <group position={position} rotation={[0, prop.rotationY, 0]} scale={prop.scale}>
        <mesh castShadow position={[-1.2, 0.45, 0]}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color="#8a653f" roughness={0.88} />
        </mesh>
        <mesh castShadow position={[1.2, 0.45, 0]}>
          <boxGeometry args={[0.12, 0.9, 0.12]} />
          <meshStandardMaterial color="#8a653f" roughness={0.88} />
        </mesh>
        <mesh castShadow position={[0, 0.62, 0]}>
          <boxGeometry args={[2.7, 0.12, 0.12]} />
          <meshStandardMaterial color="#8a653f" roughness={0.88} />
        </mesh>
      </group>
    )
  }

  if (prop.kind === "sign") {
    return (
      <group position={position} rotation={[0, prop.rotationY, 0]} scale={prop.scale}>
        <mesh castShadow position={[0, 0.6, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 1.2, 6]} />
          <meshStandardMaterial color="#6b4d35" roughness={0.85} />
        </mesh>
        <mesh castShadow position={[0, 1.25, 0]}>
          <boxGeometry args={[1.1, 0.42, 0.08]} />
          <meshStandardMaterial color="#f2d070" roughness={0.65} />
        </mesh>
      </group>
    )
  }

  if (prop.kind === "building") {
    return (
      <group position={position} rotation={[0, prop.rotationY, 0]} scale={prop.scale}>
        <mesh castShadow receiveShadow position={[0, 0.75, 0]}>
          <boxGeometry args={[2.6, 1.5, 2.2]} />
          <meshStandardMaterial color="#c9b38b" roughness={0.88} />
        </mesh>
        <mesh castShadow position={[0, 1.7, 0]} rotation={[0, Math.PI / 4, 0]}>
          <coneGeometry args={[1.9, 1.1, 4]} />
          <meshStandardMaterial color="#8f4d3c" roughness={0.86} />
        </mesh>
      </group>
    )
  }

  if (prop.kind === "water") {
    return (
      <mesh position={[position[0], position[1] + 0.02, position[2]]} scale={prop.scale}>
        <circleGeometry args={[2.2, 12]} />
        <meshStandardMaterial color="#6fb6bf" roughness={0.45} side={DoubleSide} />
      </mesh>
    )
  }

  return (
    <mesh position={[position[0], position[1] + 0.03, position[2]]} scale={prop.scale}>
      <boxGeometry args={[3.4, 0.05, 2.2]} />
      <meshStandardMaterial color="#d7bd61" roughness={0.92} side={DoubleSide} />
    </mesh>
  )
}

function useInstanceMatrices(
  props: Array<WorldProp>,
  ref: React.RefObject<InstancedMesh | null>,
  map: (prop: WorldProp) => {
    position: [number, number, number]
    scale: [number, number, number]
  }
) {
  const matrix = useMemo(() => new Matrix4(), [])
  const quaternion = useMemo(() => new Quaternion(), [])

  useLayoutEffect(() => {
    if (!ref.current) return
    props.forEach((prop, index) => {
      const mapped = map(prop)
      matrix.compose(
        new Vector3(...mapped.position),
        quaternion.setFromAxisAngle(new Vector3(0, 1, 0), prop.rotationY),
        new Vector3(...mapped.scale)
      )
      ref.current?.setMatrixAt(index, matrix)
    })
    ref.current.instanceMatrix.needsUpdate = true
  }, [map, matrix, props, quaternion, ref])
}
