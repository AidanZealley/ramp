import { useQuery } from "convex/react"
import { api } from "#convex/_generated/api"

export const useIsAdmin = () => {
  const currentUser = useQuery(api.auth.currentUser)
  return {
    isAdmin: currentUser?.role === "admin",
    isLoading: currentUser === undefined,
  }
}
