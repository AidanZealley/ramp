import { useCallback, useEffect, useRef } from "react"
import { TERRAIN_SOURCE_ID } from "../constants"
import type { RefObject } from "react"
import type { MapRef } from "@vis.gl/react-maplibre"
import type { RouteMapViewMode } from "@/experiences/route-simulation/types"
import type { RoutePosition } from "@/lib/routes/types"
import type { MutableMapElevation } from "../types"
import { ROUTE_TERRAIN_EXAGGERATION } from "@/components/route/route-map/constants"

const forceMapCenterElevation = (
  map: MutableMapElevation | undefined,
  elevation: number
) => {
  if (!map?.transform?.setElevation) return

  // MapLibre 5.24.0 can leave center elevation frozen during overlapping
  // follow flights, so perspective follow updates the active transform directly.
  map._elevationFreeze = false
  map.transform.setElevation(elevation)
  map.triggerRepaint?.()
}

type UseRouteMapTerrainArgs = {
  followPosition: boolean
  mapRef: RefObject<MapRef | null>
  mapStyle: unknown
  riderPosition: RoutePosition | null
  terrainEnabled: boolean
  viewMode: RouteMapViewMode
}

export const useRouteMapTerrain = ({
  followPosition,
  mapRef,
  mapStyle,
  riderPosition,
  terrainEnabled,
  viewMode,
}: UseRouteMapTerrainArgs) => {
  const appliedTerrainEnabledRef = useRef<boolean | null>(null)

  const applyTerrain = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return

    if (!terrainEnabled) {
      if (appliedTerrainEnabledRef.current !== false) {
        map.setTerrain(null)
        appliedTerrainEnabledRef.current = false
      }
      return
    }

    if (!map.getSource(TERRAIN_SOURCE_ID)) return
    if (appliedTerrainEnabledRef.current === true) return

    map.setTerrain({
      source: TERRAIN_SOURCE_ID,
      exaggeration: ROUTE_TERRAIN_EXAGGERATION,
    })
    appliedTerrainEnabledRef.current = true
  }, [mapRef, terrainEnabled])

  const getPerspectiveTerrainElevation = useCallback(
    (position: RoutePosition) => {
      if (!terrainEnabled) return undefined

      const terrainElevation =
        mapRef.current?.queryTerrainElevation([position.lng, position.lat]) ??
        null

      return terrainElevation !== null && Number.isFinite(terrainElevation)
        ? terrainElevation
        : undefined
    },
    [mapRef, terrainEnabled]
  )

  const syncPerspectiveCameraElevation = useCallback((positionOverride?: RoutePosition | null) => {
    const position = positionOverride ?? riderPosition
    if (
      viewMode !== "perspective" ||
      !followPosition ||
      !terrainEnabled ||
      !position
    ) {
      return
    }

    const elevation = getPerspectiveTerrainElevation(position)
    if (elevation === undefined) return

    const map = mapRef.current?.getMap() as MutableMapElevation | undefined
    forceMapCenterElevation(map, elevation)
  }, [
    followPosition,
    getPerspectiveTerrainElevation,
    mapRef,
    riderPosition,
    terrainEnabled,
    viewMode,
  ])

  const handleTerrainSourceData = useCallback(
    (event: { sourceId: string }) => {
      if (event.sourceId !== TERRAIN_SOURCE_ID) return

      applyTerrain()
      syncPerspectiveCameraElevation()
    },
    [applyTerrain, syncPerspectiveCameraElevation]
  )

  useEffect(() => {
    appliedTerrainEnabledRef.current = null
  }, [mapStyle])

  return {
    applyTerrain,
    getPerspectiveTerrainElevation,
    handleTerrainSourceData,
    syncPerspectiveCameraElevation,
  }
}
