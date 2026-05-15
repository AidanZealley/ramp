import { describe, expect, it } from "vitest"
import { parseRouteGpxText } from "./gpx"

function gpx(points: string, name = "Test Route") {
  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ramp">
  <metadata><name>${name}</name></metadata>
  <trk><name>${name}</name><trkseg>${points}</trkseg></trk>
</gpx>`
}

function trkpt(lat: number, lon: number, ele?: number) {
  return `<trkpt lat="${lat}" lon="${lon}">${ele === undefined ? "" : `<ele>${ele}</ele>`}</trkpt>`
}

describe("parseRouteGpxText", () => {
  it("extracts title, stats, bounds, endpoints, preview, and elevation samples", () => {
    const result = parseRouteGpxText(
      gpx([trkpt(40, -105, 100), trkpt(40.01, -105.01, 130), trkpt(40.02, -105.02, 120)].join("")),
      "fallback.gpx"
    )

    expect(result.kind).toBe("success")
    if (result.kind !== "success") return

    expect(result.route.title).toBe("Test Route")
    expect(result.route.stats.pointCount).toBe(3)
    expect(result.route.stats.distanceMeters).toBeGreaterThan(2000)
    expect(result.route.stats.elevationGainMeters).toBe(30)
    expect(result.route.stats.elevationLossMeters).toBe(10)
    expect(result.route.stats.minElevationMeters).toBe(100)
    expect(result.route.stats.maxElevationMeters).toBe(130)
    expect(result.route.bounds).toEqual({
      minLat: 40,
      minLng: -105.02,
      maxLat: 40.02,
      maxLng: -105,
    })
    expect(result.route.start).toEqual({ lat: 40, lng: -105 })
    expect(result.route.finish).toEqual({ lat: 40.02, lng: -105.02 })
    expect(
      result.route.geojson.features[0]?.geometry.coordinates
    ).toEqual([
      [-105, 40],
      [-105.01, 40.01],
      [-105.02, 40.02],
    ])
    expect(result.route.previewPoints).toHaveLength(3)
    expect(result.route.elevationSamples).toHaveLength(3)
  })

  it("rejects invalid XML and too few coordinates", () => {
    expect(parseRouteGpxText("<gpx><trk>", "bad.gpx")).toEqual({
      kind: "error",
      message: "Invalid GPX XML",
    })

    expect(parseRouteGpxText(gpx(trkpt(40, -105)), "short.gpx")).toEqual({
      kind: "error",
      message: "GPX must include at least two valid coordinates",
    })
  })

  it("allows missing elevation without chart samples", () => {
    const result = parseRouteGpxText(
      gpx([trkpt(40, -105), trkpt(40.01, -105.01)].join("")),
      "flat.gpx"
    )

    expect(result.kind).toBe("success")
    if (result.kind !== "success") return
    expect(result.route.stats.minElevationMeters).toBeNull()
    expect(result.route.stats.maxElevationMeters).toBeNull()
    expect(result.route.elevationSamples).toEqual([])
  })

  it("flattens multiple tracks and downsamples chart and mini preview points", () => {
    const points = Array.from({ length: 620 }, (_, index) =>
      trkpt(40 + index * 0.001, -105 - index * 0.001, 100 + index)
    )
    const text = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ramp">
  <trk><trkseg>${points.slice(0, 310).join("")}</trkseg></trk>
  <trk><trkseg>${points.slice(310).join("")}</trkseg></trk>
</gpx>`

    const result = parseRouteGpxText(text, "many.gpx")

    expect(result.kind).toBe("success")
    if (result.kind !== "success") return
    expect(result.route.stats.pointCount).toBe(620)
    expect(result.route.previewPoints).toHaveLength(80)
    expect(result.route.elevationSamples).toHaveLength(500)
  })
})
