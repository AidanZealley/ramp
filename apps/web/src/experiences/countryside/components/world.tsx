import { memo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import { generateWorldChunk } from "../procgen/generate"
import { RIDE_WORLD } from "../world-config"
import { RideChunk } from "./chunk"
import type { MutableRefObject } from "react"
import type { RideFrameData } from "@ramp/ride-core"

type RideWorldProps = {
  frameRef: MutableRefObject<RideFrameData | null>
}

function buildChunks(currentIndex: number) {
  const generated = []
  for (let index = currentIndex - 1; index <= currentIndex + 4; index += 1) {
    generated.push(generateWorldChunk({ ...RIDE_WORLD, index }))
  }
  return generated
}

export const RideWorld = memo(function RideWorld({ frameRef }: RideWorldProps) {
  const [chunks, setChunks] = useState(() => buildChunks(0))
  const lastChunkIndex = useRef(-1)

  useFrame(() => {
    const distanceMeters = frameRef.current?.distanceMeters ?? 0
    const currentIndex = Math.floor(
      distanceMeters / RIDE_WORLD.chunkLengthMeters
    )

    if (currentIndex !== lastChunkIndex.current) {
      lastChunkIndex.current = currentIndex
      setChunks(buildChunks(currentIndex))
    }
  })

  return (
    <group>
      {chunks.map((chunk) => (
        <RideChunk chunk={chunk} key={chunk.id} />
      ))}
    </group>
  )
})
