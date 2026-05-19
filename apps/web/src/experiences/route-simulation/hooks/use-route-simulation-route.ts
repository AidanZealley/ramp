import { useCallback, useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import type { Id } from "#convex/_generated/dataModel"
import type { useNavigate } from "@tanstack/react-router"
import type { ParsedRouteGpx } from "@/lib/routes/types"
import type { RouteSimulationRouteState } from "../types"
import { api } from "#convex/_generated/api"
import { parseRouteGpxText } from "@/lib/routes/gpx"

type UseRouteSimulationRouteInput = {
  linkedRouteId: Id<"routes"> | undefined
  navigate: ReturnType<typeof useNavigate>
  onRouteChange?: () => void
}

export function useRouteSimulationRoute({
  linkedRouteId,
  navigate,
  onRouteChange,
}: UseRouteSimulationRouteInput): RouteSimulationRouteState {
  const routes = useQuery(api.routes.list)
  const routeDoc = useQuery(
    api.routes.get,
    linkedRouteId ? { id: linkedRouteId } : "skip"
  )
  const [selectedRouteId, setSelectedRouteId] = useState<Id<"routes"> | null>(
    linkedRouteId ?? null
  )
  const [parsedRoute, setParsedRoute] = useState<ParsedRouteGpx | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedRouteId(linkedRouteId ?? null)
  }, [linkedRouteId])

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
        setParsedRoute(result.route)
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
  }, [linkedRouteId, routeDoc])

  const selectedRouteDoc = useMemo(
    () => routes?.find((route) => route._id === selectedRouteId) ?? null,
    [routes, selectedRouteId]
  )
  const activeRouteTitle = routeDoc?.title ?? selectedRouteDoc?.title ?? null

  const handleSelectRoute = useCallback(
    (routeId: Id<"routes">) => {
      onRouteChange?.()
      setSelectedRouteId(routeId)
      void (navigate as unknown as (options: {
        search: (previous: Record<string, unknown>) => Record<string, unknown>
        replace: boolean
      }) => void)({
        search: (previous) => ({ ...previous, routeId }),
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
      (linkedRouteId !== undefined && routeDoc === undefined),
    linkedRouteId,
    loadError,
    parsedRoute,
    routes: routes ?? [],
    selectedRouteId,
  }
}
