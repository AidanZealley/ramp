import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import type { Id } from "#convex/_generated/dataModel"
import type { useNavigate } from "@tanstack/react-router"
import type { ParsedRouteGpx } from "@/lib/routes/types"
import type { RouteSimulationRouteState } from "../types"
import { api } from "#convex/_generated/api"
import { parseRouteGpxText } from "@/lib/routes/gpx"
import { sliceParsedRouteGpx } from "@/lib/routes/slice"

type UseRouteSimulationRouteInput = {
  linkedRouteId: Id<"routes"> | undefined
  linkedRouteSegmentId: Id<"routeSegments"> | undefined
  navigate: ReturnType<typeof useNavigate>
  onRouteChange?: () => void
}

export function useRouteSimulationRoute({
  linkedRouteId,
  linkedRouteSegmentId,
  navigate,
  onRouteChange,
}: UseRouteSimulationRouteInput): RouteSimulationRouteState {
  const routes = useQuery(api.routes.list)
  const routeDoc = useQuery(
    api.routes.get,
    linkedRouteId ? { id: linkedRouteId } : "skip"
  )
  const routeSegments = useQuery(
    api.routeSegments.listByRoute,
    linkedRouteId ? { routeId: linkedRouteId } : "skip"
  )
  const [selectedRouteId, setSelectedRouteId] = useState<Id<"routes"> | null>(
    linkedRouteId ?? null
  )
  const [selectedRouteSegmentId, setSelectedRouteSegmentId] =
    useState<Id<"routeSegments"> | null>(linkedRouteSegmentId ?? null)
  const [parsedRoute, setParsedRoute] = useState<ParsedRouteGpx | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedRouteId(linkedRouteId ?? null)
  }, [linkedRouteId])

  useEffect(() => {
    setSelectedRouteSegmentId(linkedRouteSegmentId ?? null)
  }, [linkedRouteSegmentId])

  useEffect(() => {
    let cancelled = false
    setParsedRoute(null)
    setLoadError(null)

    if (!routeDoc) {
      if (routeDoc === null && linkedRouteId) {
        setLoadError("Route not found. Pick another route.")
      }
      return
    }

    if (linkedRouteSegmentId && routeSegments === undefined) return

    if (!routeDoc.fileUrl) {
      setLoadError("Route GPX file is unavailable. Pick another route.")
      return
    }

    void fetch(routeDoc.fileUrl)
      .then((response) => {
        if (!response.ok) throw new Error("Couldn't load GPX file")
        return response.text()
      })
      .then((text) => {
        if (cancelled) return
        const result = parseRouteGpxText(text, routeDoc.originalFileName)
        if (result.kind === "error") {
          setLoadError(result.message)
          return
        }
        if (!linkedRouteSegmentId) {
          setParsedRoute(result.route)
          return
        }

        const sortedSegments = [...(routeSegments ?? [])].sort(
          (a, b) => a.startDistanceMeters - b.startDistanceMeters
        )
        const segmentIndex = sortedSegments.findIndex(
          (segment) => segment._id === linkedRouteSegmentId
        )
        const segment = segmentIndex >= 0 ? sortedSegments[segmentIndex] : null
        if (!segment) {
          setLoadError("Route segment not found. Pick another route.")
          return
        }

        try {
          setParsedRoute(
            sliceParsedRouteGpx(
              result.route,
              {
                startDistanceMeters: segment.startDistanceMeters,
                endDistanceMeters: segment.endDistanceMeters,
              },
              { title: `${routeDoc.title} - Climb ${segmentIndex + 1}` }
            )
          )
        } catch (error) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Route segment could not be sliced."
          )
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setLoadError(
          error instanceof Error ? error.message : "Couldn't load GPX file"
        )
      })

    return () => {
      cancelled = true
    }
  }, [linkedRouteId, linkedRouteSegmentId, routeDoc, routeSegments])

  const selectedRouteDoc = useMemo(
    () => routes?.find((route) => route._id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  )
  const selectedSegmentIndex = useMemo(() => {
    if (!linkedRouteSegmentId || !routeSegments) return -1
    return [...routeSegments]
      .sort((a, b) => a.startDistanceMeters - b.startDistanceMeters)
      .findIndex((segment) => segment._id === linkedRouteSegmentId)
  }, [linkedRouteSegmentId, routeSegments])
  const baseRouteTitle = routeDoc?.title ?? selectedRouteDoc?.title ?? null
  const activeRouteTitle =
    baseRouteTitle && selectedSegmentIndex >= 0
      ? `${baseRouteTitle} - Climb ${selectedSegmentIndex + 1}`
      : baseRouteTitle

  const handleSelectRoute = useCallback(
    (routeId: Id<"routes">) => {
      onRouteChange?.()
      setSelectedRouteId(routeId)
      void (navigate as unknown as (options: {
        search: (previous: Record<string, unknown>) => Record<string, unknown>
        replace: boolean
      }) => void)({
        search: (previous) => {
          const nextSearch: Record<string, unknown> = { ...previous, routeId }
          delete nextSearch.routeSegmentId
          return nextSearch
        },
        replace: true,
      })
    },
    [navigate, onRouteChange]
  )

  const handleChangeRoute = useCallback(() => {
    onRouteChange?.()
    setSelectedRouteId(null)
    setParsedRoute(null)
    setLoadError(null)
    void (navigate as unknown as (options: {
      search: (previous: Record<string, unknown>) => Record<string, unknown>
      replace: boolean
    }) => void)({
      search: (previous) => {
        const nextSearch = { ...previous }
        delete nextSearch.routeId
        delete nextSearch.routeSegmentId
        return nextSearch
      },
      replace: true,
    })
  }, [navigate, onRouteChange])

  return {
    activeRouteTitle,
    handleChangeRoute,
    handleSelectRoute,
    isLoading:
      routes === undefined ||
      (linkedRouteId !== undefined && routeDoc === undefined) ||
      (linkedRouteSegmentId !== undefined && routeSegments === undefined),
    linkedRouteId,
    linkedRouteSegmentId,
    loadError,
    parsedRoute,
    routes: routes ?? [],
    selectedRouteId,
    selectedRouteSegmentId,
    activeRouteSource: linkedRouteSegmentId ? "segment" : "route",
  }
}
