import { useMemo } from "react"
import { generateWorldChunk } from "@ramp/ride-engine"
import { RideChunk } from "./ride-chunk"
import { RIDE_WORLD } from "./ride-world-config"

type RideWorldProps = {
  distanceMeters: number
}

export function RideWorld({ distanceMeters }: RideWorldProps) {
  const chunks = useMemo(() => {
    const currentIndex = Math.floor(
      distanceMeters / RIDE_WORLD.chunkLengthMeters
    )
    const generated = []

    for (let index = currentIndex - 1; index <= currentIndex + 4; index += 1) {
      generated.push(generateWorldChunk({ ...RIDE_WORLD, index }))
    }

    return generated
  }, [distanceMeters])

  return (
    <group>
      {chunks.map((chunk) => (
        <RideChunk chunk={chunk} key={chunk.id} />
      ))}
    </group>
  )
}
