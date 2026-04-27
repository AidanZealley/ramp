import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { api } from "../../../../convex/_generated/api"
import type { Id } from "../../../../convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { DAYS_PER_WEEK, WEEKDAY_SHORT, WEEKDAYS } from "../constants"
import type { PlanEditorWeek } from "../types"
import { DialogWeekdaySlot } from "./components/dialog-weekday-slot"
import { DialogWorkoutFilters } from "./components/dialog-workout-filters"
import { DialogWorkoutGrid } from "./components/dialog-workout-grid"
import type {
  DurationFilter,
  SortOption,
} from "./types"
import type { PowerDisplayMode } from "@/lib/workout-utils"
import { matchesWorkoutFilters, sortWorkouts } from "./utils"

interface SelectWorkoutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  week: PlanEditorWeek | null
  weekNumber: number
  initialDayIndex: number
  displayMode: PowerDisplayMode
}

const defaultFilters = {
  search: "",
  debouncedSearch: "",
  durationFilter: "any" as DurationFilter,
  sort: "recent" as SortOption,
}

export function SelectWorkoutsDialog({
  open,
  onOpenChange,
  week,
  weekNumber,
  initialDayIndex,
  displayMode,
}: SelectWorkoutsDialogProps) {
  const workouts = useQuery(api.workouts.list)
  const settings = useQuery(api.settings.get)
  const updateWeekSchedule = useMutation(api.plans.updateWeekSchedule)

  const ftp = settings?.ftp ?? 150
  const [activeDayIndex, setActiveDayIndex] = useState(0)
  const [scheduledWorkoutIds, setScheduledWorkoutIds] = useState<
    Array<Id<"workouts"> | null>
  >(Array(DAYS_PER_WEEK).fill(null))
  const [search, setSearch] = useState(defaultFilters.search)
  const [debouncedSearch, setDebouncedSearch] = useState(
    defaultFilters.debouncedSearch
  )
  const [durationFilter, setDurationFilter] = useState(
    defaultFilters.durationFilter
  )
  const [sort, setSort] = useState(defaultFilters.sort)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedSearch(search.trim().toLowerCase())
    }, 150)
    return () => window.clearTimeout(handle)
  }, [search])

  useEffect(() => {
    if (!open || !week) return

    setActiveDayIndex(Math.max(0, Math.min(initialDayIndex, DAYS_PER_WEEK - 1)))
    setScheduledWorkoutIds(
      Array.from({ length: DAYS_PER_WEEK }, (_, dayIndex) => {
        const slot = week.slots.find(
          (currentSlot) => currentSlot.dayIndex === dayIndex
        )
        return slot?.workout ? slot.workout._id : null
      })
    )
    setSearch(defaultFilters.search)
    setDebouncedSearch(defaultFilters.debouncedSearch)
    setDurationFilter(defaultFilters.durationFilter)
    setSort(defaultFilters.sort)
  }, [initialDayIndex, open, week])

  const workoutById = useMemo(() => {
    return new Map((workouts ?? []).map((workout) => [workout._id, workout]))
  }, [workouts])

  const filteredWorkouts = useMemo(() => {
    if (!workouts) return []

    return sortWorkouts(
      workouts.filter((workout) =>
        matchesWorkoutFilters(workout, {
          search: debouncedSearch,
          durationFilter,
        })
      ),
      sort
    )
  }, [debouncedSearch, durationFilter, sort, workouts])

  const clearFilters = () => {
    setSearch(defaultFilters.search)
    setDebouncedSearch(defaultFilters.debouncedSearch)
    setDurationFilter(defaultFilters.durationFilter)
    setSort(defaultFilters.sort)
  }

  const assignWorkout = (
    workoutId: Id<"workouts">,
    dayIndex = activeDayIndex
  ) => {
    setScheduledWorkoutIds((current) =>
      current.map((existingId, index) =>
        index === dayIndex ? workoutId : existingId
      )
    )
  }

  const clearActiveDay = () => {
    setScheduledWorkoutIds((current) =>
      current.map((existingId, index) =>
        index === activeDayIndex ? null : existingId
      )
    )
  }

  const handleSave = async () => {
    if (!week) return

    const normalized = scheduledWorkoutIds.map((workoutId) =>
      workoutId && workoutById.has(workoutId) ? workoutId : null
    )
    await updateWeekSchedule({ weekId: week._id, workoutIdsByDay: normalized })
    toast.success(`Week ${weekNumber} updated`)
    onOpenChange(false)
  }

  if (!week) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,860px)] w-full max-w-[min(96vw,96rem)] flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Select Workouts for Week {weekNumber}</DialogTitle>
          <DialogDescription>
            Build the Monday to Sunday schedule, then save the week.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-6 pb-4">
          <div className="overflow-x-auto pb-1">
            <div className="grid min-w-3xl grid-cols-7 gap-2">
              {Array.from({ length: DAYS_PER_WEEK }, (_, dayIndex) => (
                <DialogWeekdaySlot
                  key={dayIndex}
                  dayIndex={dayIndex}
                  workout={
                    scheduledWorkoutIds[dayIndex]
                      ? (workoutById.get(scheduledWorkoutIds[dayIndex]) ?? null)
                      : null
                  }
                  ftp={ftp}
                  displayMode={displayMode}
                  active={dayIndex === activeDayIndex}
                  onClick={() => setActiveDayIndex(dayIndex)}
                />
              ))}
            </div>
          </div>

          <DialogWorkoutFilters
            search={search}
            onSearchChange={setSearch}
            durationFilter={durationFilter}
            onDurationFilterChange={setDurationFilter}
            sort={sort}
            onSortChange={setSort}
          />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Assigning {WEEKDAYS[activeDayIndex]}. Showing{" "}
              {filteredWorkouts.length} of {workouts?.length ?? 0}.
            </span>
            <Button variant="ghost" size="sm" onClick={clearActiveDay}>
              <Trash2 className="size-4" />
              Clear {WEEKDAY_SHORT[activeDayIndex]}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-t border-border/40 px-6 py-4">
          <DialogWorkoutGrid
            workouts={filteredWorkouts}
            ftp={ftp}
            displayMode={displayMode}
            onWorkoutSelect={(workout) => assignWorkout(workout._id)}
            onClearFilters={clearFilters}
          />
        </div>

        <div className="border-t border-border/60 bg-popover px-6 py-4">
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSave()}>Save Week</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
