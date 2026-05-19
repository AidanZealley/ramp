import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import type {
  RouteProgressMode,
  RouteSimulationSettingsState,
} from "../types"
import { createIndoorLikePhysicsConfig } from "@/experiences/physics"
import { api } from "#convex/_generated/api"

type UseRouteSimulationSettingsInput = {
  onProgressModeReset?: () => void
}

export function useRouteSimulationSettings({
  onProgressModeReset,
}: UseRouteSimulationSettingsInput = {}): RouteSimulationSettingsState {
  const settings = useQuery(api.settings.get)
  const upsertSettings = useMutation(api.settings.upsert)
  const [progressMode, setProgressMode] =
    useState<RouteProgressMode>("trainer-speed")
  const progressModeRef = useRef<RouteProgressMode>(progressMode)

  useEffect(() => {
    progressModeRef.current = progressMode
  }, [progressMode])

  useEffect(() => {
    if (settings) {
      if (settings.routeSimulationProgressMode !== progressModeRef.current) {
        onProgressModeReset?.()
      }
      setProgressMode(settings.routeSimulationProgressMode)
    }
  }, [onProgressModeReset, settings])

  const handleProgressModeChange = useCallback(
    (mode: RouteProgressMode) => {
      onProgressModeReset?.()
      setProgressMode(mode)
      void upsertSettings({ routeSimulationProgressMode: mode })
    },
    [onProgressModeReset, upsertSettings]
  )

  const physicsConfig = useMemo(
    () =>
      settings
        ? createIndoorLikePhysicsConfig({
            riderWeightKg: settings.riderWeightKg,
            bikeWeightKg: settings.bikeWeightKg,
          })
        : null,
    [settings]
  )

  return {
    handleProgressModeChange,
    physicsConfig,
    physicsProfileReady: settings !== undefined,
    progressMode,
  }
}
