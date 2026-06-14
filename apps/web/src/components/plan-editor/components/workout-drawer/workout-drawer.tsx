import { useEffect, useMemo, useState } from "react"
import { useQuery } from "convex/react"
import { getDayFullLabel } from "../week-view"
import { DrawerSearch } from "./drawer-search"
import { DrawerFilterChips } from "./drawer-filter-chips"
import { DrawerRecentRow } from "./drawer-recent-row"
import { DrawerResultsList } from "./drawer-results-list"
import {
  getRecentWorkouts,
  matchesWorkoutFilters,
  sortByRecent,
} from "./utils"
import type { DurationFilter } from "./types"
import type { Id } from "#convex/_generated/dataModel"
import { api } from "#convex/_generated/api"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { useMediaQuery } from "@/hooks/use-media-query"

interface WorkoutDrawerProps {
  open: boolean
  activeDayIndex: number
  mode?: "add" | "swap"
  onOpenChange: (open: boolean) => void
  onAssign: (workoutId: Id<"workouts">) => void
}

const RECENT_LIMIT = 3

export function WorkoutDrawer({
  open,
  activeDayIndex,
  mode = "add",
  onOpenChange,
  onAssign,
}: WorkoutDrawerProps) {
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const workouts = useQuery(api.workouts.list)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [durationFilter, setDurationFilter] = useState<DurationFilter>("any")

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase())
    }, 150)
    return () => window.clearTimeout(handle)
  }, [search])

  // Reset filters each time the drawer opens fresh; filters persist across the
  // desktop auto-advance so similar workouts can be assigned quickly.
  useEffect(() => {
    if (!open) return
    setSearch("")
    setDebouncedSearch("")
    setDurationFilter("any")
  }, [open])

  const recentWorkouts = useMemo(
    () => getRecentWorkouts(workouts ?? [], RECENT_LIMIT),
    [workouts]
  )

  const filteredWorkouts = useMemo(() => {
    if (!workouts) return []
    return sortByRecent(
      workouts.filter((workout) =>
        matchesWorkoutFilters(workout, {
          search: debouncedSearch,
          durationFilter,
        })
      )
    )
  }, [workouts, debouncedSearch, durationFilter])

  const showRecent =
    recentWorkouts.length > 0 && debouncedSearch === "" && durationFilter === "any"

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isDesktop ? "right" : "bottom"}
        className="gap-0"
      >
        <SheetHeader className="px-5 pt-5 pr-12 pb-4">
          <SheetTitle>
            {mode === "swap" ? "Swap workout for" : "Add workout to"}{" "}
            {getDayFullLabel(activeDayIndex)}
          </SheetTitle>
          <SheetDescription>
            Select a workout to assign it instantly.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-3 px-5 pb-4">
          <DrawerSearch value={search} onChange={setSearch} />
          <DrawerFilterChips value={durationFilter} onChange={setDurationFilter} />
          {showRecent && (
            <DrawerRecentRow workouts={recentWorkouts} onSelect={onAssign} />
          )}
        </div>

        <DrawerResultsList
          workouts={filteredWorkouts}
          totalCount={workouts?.length ?? 0}
          onSelect={onAssign}
          className="min-h-0 flex-1 overflow-y-auto px-5 pb-5"
        />
      </SheetContent>
    </Sheet>
  )
}
