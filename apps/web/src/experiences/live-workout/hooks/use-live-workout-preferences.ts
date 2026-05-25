import { useQuery } from "convex/react"
import { DEFAULT_FTP } from "@/lib/workout-utils"
import { api } from "#convex/_generated/api"

export function useLiveWorkoutPreferences() {
  const preferences = useQuery(api.preferences.get)

  return {
    preferences,
    ftp: preferences?.ftp ?? DEFAULT_FTP,
    preferencesReady: preferences !== undefined,
  }
}
