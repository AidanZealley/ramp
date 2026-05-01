export type WorldTheme = "countryside"
export type Vec3Tuple = [number, number, number]

export type RouteSample = {
  position: Vec3Tuple
  tangent: Vec3Tuple
  grade: number
}

export type TerrainPatch = {
  id: string
  side: "left" | "right"
  color: string
  corners: [Vec3Tuple, Vec3Tuple, Vec3Tuple, Vec3Tuple]
}

export type WorldPropKind =
  | "tree"
  | "rock"
  | "fence"
  | "sign"
  | "water"
  | "field"
  | "building"

export type WorldProp = {
  id: string
  kind: WorldPropKind
  position: Vec3Tuple
  rotationY: number
  scale: number
}

export type WorldChunk = {
  id: string
  index: number
  startDistanceMeters: number
  endDistanceMeters: number
  routeSamples: Array<RouteSample>
  terrainPatches: Array<TerrainPatch>
  props: Array<WorldProp>
}

export type WorldState = {
  theme: WorldTheme
  seed: string
  chunkLengthMeters: number
  roadHalfWidthMeters?: number
}

export type GenerateWorldChunkInput = WorldState & {
  index: number
}
