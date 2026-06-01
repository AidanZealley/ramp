import { readFile } from "node:fs/promises"
import { describe, expect, it } from "vitest"

type MapStyleLayer = {
  filter?: unknown
  id: string
  layout?: Record<string, unknown>
  paint?: Record<string, unknown>
  source?: string
  "source-layer"?: string
  type?: string
}

type MapStyle = {
  layers: Array<MapStyleLayer>
}

const styleFiles = [
  "../../../../public/map-styles/dark.json",
  "../../../../public/map-styles/positron.json",
]

const isLinePlacedTransportationNameLayer = (layer: MapStyleLayer) =>
  layer.type === "symbol" &&
  layer.source === "openmaptiles" &&
  layer["source-layer"] === "transportation_name" &&
  layer.layout?.["symbol-placement"] !== "point"

const getZoomSpacingStops = (symbolSpacing: unknown) => {
  if (!Array.isArray(symbolSpacing)) return []
  const zoomIndex = symbolSpacing.findIndex(
    (item) => Array.isArray(item) && item[0] === "zoom"
  )
  if (zoomIndex === -1) return []

  const stopTokens = symbolSpacing.slice(zoomIndex + 1)
  const stops: Array<{ zoom: number; spacing: number }> = []
  for (let index = 0; index < stopTokens.length - 1; index += 2) {
    const zoom = stopTokens[index]
    const spacing = stopTokens[index + 1]
    if (typeof zoom === "number" && typeof spacing === "number") {
      stops.push({ zoom, spacing })
    }
  }
  return stops
}

const isGetExpression = (value: unknown, field: string) =>
  Array.isArray(value) && value[0] === "get" && value[1] === field

const comparisonReferencesField = (value: unknown, field: string): boolean => {
  if (!Array.isArray(value)) return false

  const [operator, left, right] = value
  if (
    [">", ">=", "<", "<="].includes(String(operator)) &&
    (isGetExpression(left, field) || isGetExpression(right, field))
  ) {
    return true
  }

  return value.some((item) => comparisonReferencesField(item, field))
}

const hasFilterGuard = (filter: unknown, field: string) =>
  Array.isArray(filter) &&
  filter.some(
    (part) => Array.isArray(part) && part[0] === "has" && part[1] === field
  )

const hasZeroGapDasharray = (layer: MapStyleLayer) =>
  Array.isArray(layer.paint?.["line-dasharray"]) &&
  layer.paint["line-dasharray"].some(
    (value, index) => index % 2 === 1 && value === 0
  )

describe("route map styles", () => {
  it.each(styleFiles)(
    "%s spaces line road labels out at high zoom",
    async (styleFile) => {
      const styleUrl = new URL(styleFile, import.meta.url)
      const style = JSON.parse(await readFile(styleUrl, "utf8")) as MapStyle

      const lineRoadLabelLayers = style.layers.filter(
        isLinePlacedTransportationNameLayer
      )

      expect(lineRoadLabelLayers.length).toBeGreaterThan(0)
      for (const layer of lineRoadLabelLayers) {
        const stops = getZoomSpacingStops(layer.layout?.["symbol-spacing"])
        expect(stops, layer.id).toContainEqual({ zoom: 20, spacing: 3200 })
      }
    }
  )

  it("guards light style numeric feature comparisons against missing properties", async () => {
    const styleUrl = new URL(styleFiles[1], import.meta.url)
    const style = JSON.parse(await readFile(styleUrl, "utf8")) as MapStyle

    for (const layer of style.layers) {
      for (const field of ["admin_level", "ref_length"]) {
        if (comparisonReferencesField(layer.filter, field)) {
          expect(hasFilterGuard(layer.filter, field), layer.id).toBe(true)
        }
      }
    }
  })

  it("hides dark style one-way road arrows", async () => {
    const styleUrl = new URL(styleFiles[0], import.meta.url)
    const style = JSON.parse(await readFile(styleUrl, "utf8")) as MapStyle

    const oneWayLayers = style.layers.filter((layer) =>
      ["road_oneway", "road_oneway_opposite"].includes(layer.id)
    )

    expect(oneWayLayers).toHaveLength(2)
    for (const layer of oneWayLayers) {
      expect(layer.layout?.visibility, layer.id).toBe("none")
    }
  })

  it("does not use zero-gap dashed road casings in dark style", async () => {
    const styleUrl = new URL(styleFiles[0], import.meta.url)
    const style = JSON.parse(await readFile(styleUrl, "utf8")) as MapStyle

    const roadCasingLayers = style.layers.filter(
      (layer) =>
        layer.type === "line" &&
        layer.source === "openmaptiles" &&
        layer["source-layer"] === "transportation" &&
        layer.id.includes("_casing")
    )

    expect(roadCasingLayers.length).toBeGreaterThan(0)
    for (const layer of roadCasingLayers) {
      expect(hasZeroGapDasharray(layer), layer.id).toBe(false)
    }
  })
})
