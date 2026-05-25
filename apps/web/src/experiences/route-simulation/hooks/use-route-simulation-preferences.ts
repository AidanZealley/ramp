import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import type {
  RouteProgressMode,
  RouteSimulationPreferencesState,
} from "../types"
import { createIndoorLikePhysicsConfig } from "@/experiences/physics"
import { api } from "#convex/_generated/api"

type UseRouteSimulationPreferencesInput = {
  onProgressModeReset?: () => void
}

export function useRouteSimulationPreferences({
  onProgressModeReset,
}: UseRouteSimulationPreferencesInput = {}): RouteSimulationPreferencesState {
  const preferences = useQuery(api.preferences.get)
  const updatePreferences = useMutation(api.preferences.update)
  const [progressMode, setProgressMode] =
    useState<RouteProgressMode>("trainer-speed")
  const progressModeRef = useRef<RouteProgressMode>(progressMode)

  useEffect(() => {
    progressModeRef.current = progressMode
  }, [progressMode])

  useEffect(() => {
    if (preferences) {
      if (
        preferences.routeSimulationProgressMode !== progressModeRef.current
      ) {
        onProgressModeReset?.()
      }
      setProgressMode(preferences.routeSimulationProgressMode)
    }
  }, [onProgressModeReset, preferences])

  const handleProgressModeChange = useCallback(
    (mode: RouteProgressMode) => {
      onProgressModeReset?.()
      setProgressMode(mode)
      void updatePreferences({ routeSimulationProgressMode: mode })
    },
    [onProgressModeReset, updatePreferences]
  )

  const physicsConfig = useMemo(
    () =>
      preferences
        ? createIndoorLikePhysicsConfig({
            riderWeightKg: preferences.riderWeightKg,
            bikeWeightKg: preferences.bikeWeightKg,
          })
        : null,
    [preferences]
  )

  return {
    handleProgressModeChange,
    physicsConfig,
    physicsProfileReady: preferences !== undefined,
    progressMode,
  }
}
