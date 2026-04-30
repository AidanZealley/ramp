import type {
  GenerateWorldChunkInput,
  RouteSample,
  TerrainPatch,
  Vec3Tuple,
  WorldChunk,
  WorldProp,
  WorldPropKind,
  WorldState,
} from "./types"

const ROAD_HALF_WIDTH_METERS = 3.2
const ROAD_CLEARANCE_METERS = 6
const SAMPLE_SPACING_METERS = 12

export function generateWorldChunk(input: GenerateWorldChunkInput): WorldChunk {
  const chunkLength = input.chunkLengthMeters
  const startDistanceMeters = input.index * chunkLength
  const endDistanceMeters = startDistanceMeters + chunkLength
  const sampleCount = Math.ceil(chunkLength / SAMPLE_SPACING_METERS)
  const routeSamples: RouteSample[] = []

  for (let sampleIndex = 0; sampleIndex <= sampleCount; sampleIndex += 1) {
    const distance = startDistanceMeters + sampleIndex * SAMPLE_SPACING_METERS
    routeSamples.push(
      sampleRouteAtDistance(input, Math.min(distance, endDistanceMeters))
    )
  }

  return {
    id: `${input.seed}-${input.index}`,
    index: input.index,
    startDistanceMeters,
    endDistanceMeters,
    routeSamples,
    terrainPatches: createTerrainPatches(input, routeSamples),
    props: createProps(input, startDistanceMeters, endDistanceMeters),
  }
}

export function sampleRouteAtDistance(
  world: WorldState,
  distanceMeters: number
): RouteSample {
  const seedPhase = (hashString(world.seed) % 628) / 100
  const x =
    Math.sin(distanceMeters / 86 + seedPhase) * 18 +
    Math.sin(distanceMeters / 221 + seedPhase * 0.7) * 24
  const elevation =
    Math.sin(distanceMeters / 170 + seedPhase * 0.4) * 1.8 +
    Math.sin(distanceMeters / 57) * 0.45
  const dx =
    (Math.cos(distanceMeters / 86 + seedPhase) * 18) / 86 +
    (Math.cos(distanceMeters / 221 + seedPhase * 0.7) * 24) / 221
  const dy =
    (Math.cos(distanceMeters / 170 + seedPhase * 0.4) * 1.8) / 170 +
    (Math.cos(distanceMeters / 57) * 0.45) / 57
  const tangent = normalize([dx, dy, 1])

  return {
    position: [round(x), round(elevation), round(distanceMeters)],
    tangent,
    grade: round(dy),
  }
}

function createTerrainPatches(
  input: GenerateWorldChunkInput,
  samples: RouteSample[]
): TerrainPatch[] {
  const patches: TerrainPatch[] = []
  const colors = ["#7fb069", "#9fca6b", "#6fa15e", "#c0b66a"]

  for (let index = 0; index < samples.length - 1; index += 1) {
    const current = samples[index]
    const next = samples[index + 1]
    const color =
      colors[
        Math.abs(hashString(`${input.seed}-terrain-${input.index}-${index}`)) %
          colors.length
      ]

    patches.push(
      makeTerrainPatch(input, "left", current, next, color, index),
      makeTerrainPatch(input, "right", current, next, color, index)
    )
  }

  return patches
}

function makeTerrainPatch(
  input: GenerateWorldChunkInput,
  side: "left" | "right",
  current: RouteSample,
  next: RouteSample,
  color: string,
  index: number
): TerrainPatch {
  const direction = side === "left" ? -1 : 1
  const near = (input.roadHalfWidthMeters ?? ROAD_HALF_WIDTH_METERS) + 0.4
  const far = 38

  return {
    id: `${input.seed}-${input.index}-terrain-${side}-${index}`,
    side,
    color,
    corners: [
      offsetRoute(current, direction * near),
      offsetRoute(next, direction * near),
      offsetRoute(next, direction * far),
      offsetRoute(current, direction * far),
    ],
  }
}

function createProps(
  input: GenerateWorldChunkInput,
  startDistanceMeters: number,
  endDistanceMeters: number
): WorldProp[] {
  const random = mulberry32(hashString(`${input.seed}-props-${input.index}`))
  const props: WorldProp[] = []
  const kinds: Array<WorldPropKind> = [
    "tree",
    "tree",
    "tree",
    "rock",
    "fence",
    "sign",
    "water",
    "field",
    "building",
  ]

  for (let index = 0; index < 32; index += 1) {
    const distance =
      startDistanceMeters + random() * (endDistanceMeters - startDistanceMeters)
    const routeSample = sampleRouteAtDistance(input, distance)
    const side = random() > 0.5 ? 1 : -1
    const lateralOffset = side * (ROAD_CLEARANCE_METERS + random() * 32)
    const kind = kinds[Math.floor(random() * kinds.length)]
    props.push({
      id: `${input.seed}-${input.index}-prop-${index}`,
      kind,
      position: offsetRoute(routeSample, lateralOffset),
      rotationY: round(random() * Math.PI * 2),
      scale: round(0.7 + random() * 1.2),
    })
  }

  return props
}

function offsetRoute(sample: RouteSample, lateralOffset: number): Vec3Tuple {
  const [tx, , tz] = sample.tangent
  const normal = normalize([-tz, 0, tx])
  return [
    round(sample.position[0] + normal[0] * lateralOffset),
    sample.position[1],
    round(sample.position[2] + normal[2] * lateralOffset),
  ]
}

function normalize(vector: Vec3Tuple): Vec3Tuple {
  const length = Math.hypot(...vector) || 1
  return [
    round(vector[0] / length),
    round(vector[1] / length),
    round(vector[2] / length),
  ]
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state += 0x6d2b79f5
    let result = state
    result = Math.imul(result ^ (result >>> 15), result | 1)
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61)
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000
}
