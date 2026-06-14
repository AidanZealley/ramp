import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { PlanActionsMenu } from "./components/plan-actions-menu"
import { WeekView, findNextEmptyDay } from "./components/week-view"
import { WorkoutDrawer } from "./components/workout-drawer"
import type { Id } from "#convex/_generated/dataModel"
import type { PlanEditorWeek } from "./types"
import { api } from "#convex/_generated/api"
import { EditableTitle } from "@/components/editable-title"
import { Button } from "@/components/ui/button"
import { PlanEditorSkeleton } from "@/components/plan-editor-skeleton"
import { useMediaQuery } from "@/hooks/use-media-query"

interface PlanEditorProps {
  planId: Id<"plans">
}

export function PlanEditor({ planId }: PlanEditorProps) {
  const navigate = useNavigate()
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const plan = useQuery(api.plans.get, { planId })
  const updateTitle = useMutation(api.plans.updateTitle)
  const addWeek = useMutation(api.plans.addWeek)
  const removeWeek = useMutation(api.plans.removeWeek)
  const duplicatePlan = useMutation(api.plans.duplicatePlan)
  const removePlan = useMutation(api.plans.remove)
  const assignDayWorkout = useMutation(
    api.plans.assignDayWorkout
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.plans.get, { planId })
    if (!current) return
    const workoutList = localStore.getQuery(api.workouts.list) ?? []
    const workout = args.workoutId
      ? (workoutList.find((item) => item._id === args.workoutId) ?? null)
      : null

    localStore.setQuery(
      api.plans.get,
      { planId },
      {
        ...current,
        weeks: current.weeks.map((week) =>
          week._id === args.weekId
            ? {
                ...week,
                slots: week.slots.map((slot) =>
                  slot.dayIndex === args.dayIndex
                    ? { ...slot, workoutId: args.workoutId, workout }
                    : slot
                ),
              }
            : week
        ),
      }
    )
  })

  const [weekIndex, setWeekIndex] = useState(0)
  const [drawerState, setDrawerState] = useState<{
    activeDayIndex: number
  } | null>(null)

  const displayWeeks = useMemo<Array<PlanEditorWeek>>(() => {
    if (!plan) return []
    return plan.weeks.map((week) => ({
      ...week,
      slots: week.slots.map((slot, index) => ({
        ...slot,
        dayIndex: slot.dayIndex ?? index,
      })),
    }))
  }, [plan])

  const safeWeekIndex = Math.min(weekIndex, Math.max(0, displayWeeks.length - 1))
  const currentWeek: PlanEditorWeek | null =
    displayWeeks.length > 0 ? displayWeeks[safeWeekIndex] : null

  const handleTitleChange = async (title: string) => {
    await updateTitle({ planId, title })
  }

  const handleDuplicatePlan = async () => {
    const newPlanId = await duplicatePlan({ planId })
    toast.success("Plan duplicated")
    navigate({ to: "/plan/$id", params: { id: newPlanId } })
  }

  const handleDeletePlan = async () => {
    await removePlan({ planId })
    toast.success("Plan deleted")
    navigate({ to: "/plan" })
  }

  const handleAddWeek = async () => {
    setDrawerState(null)
    await addWeek({ planId })
    setWeekIndex(displayWeeks.length)
    toast.success("Week added")
  }

  const handleDeleteWeek = async () => {
    if (!currentWeek) return
    setDrawerState(null)
    await removeWeek({ weekId: currentWeek._id })
    setWeekIndex(Math.max(0, Math.min(safeWeekIndex, displayWeeks.length - 2)))
    toast.success("Week deleted")
  }

  const handleAssign = (workoutId: Id<"workouts">) => {
    if (!currentWeek || !drawerState) return
    const { activeDayIndex } = drawerState
    void assignDayWorkout({
      weekId: currentWeek._id,
      dayIndex: activeDayIndex,
      workoutId,
    })

    if (isDesktop) {
      const nextEmptyDay = findNextEmptyDay(currentWeek.slots, activeDayIndex)
      if (nextEmptyDay !== null) {
        setDrawerState({ activeDayIndex: nextEmptyDay })
      }
    } else {
      setDrawerState(null)
    }
  }

  if (plan === undefined) {
    return <PlanEditorSkeleton />
  }

  if (plan === null) {
    return (
      <div className="space-y-4 py-20 text-center">
        <h2 className="font-heading text-xl font-medium">Plan not found</h2>
        <p className="text-sm text-muted-foreground">
          This plan may have been deleted.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/plan" })}>
          <ArrowLeft className="size-4" />
          Back to Plans
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/plan" })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <EditableTitle
            value={plan.title}
            onChange={(title) => void handleTitleChange(title)}
          />
          <PlanActionsMenu
            onDuplicate={handleDuplicatePlan}
            onDelete={handleDeletePlan}
          />
        </div>
      </div>

      {currentWeek && (
        <WeekView
          week={currentWeek}
          weekNumber={safeWeekIndex + 1}
          totalWeeks={displayWeeks.length}
          activeDayIndex={drawerState?.activeDayIndex ?? null}
          onSelectDay={(dayIndex) => setDrawerState({ activeDayIndex: dayIndex })}
          onPrevWeek={() => {
            setDrawerState(null)
            setWeekIndex((index) => Math.max(0, index - 1))
          }}
          onNextWeek={() => {
            setDrawerState(null)
            setWeekIndex((index) =>
              Math.min(displayWeeks.length - 1, index + 1)
            )
          }}
          onAddWeek={() => void handleAddWeek()}
          onDeleteWeek={() => void handleDeleteWeek()}
        />
      )}

      <WorkoutDrawer
        open={drawerState !== null}
        activeDayIndex={drawerState?.activeDayIndex ?? 0}
        onOpenChange={(open) => {
          if (!open) setDrawerState(null)
        }}
        onAssign={handleAssign}
      />
    </div>
  )
}
