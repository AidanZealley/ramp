import { useEffect, useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { ArrowLeft } from "lucide-react"
import { PlanActionsMenu } from "./components/plan-actions-menu"
import {
  WeekView,
  getDaySlots,
  getDefaultSelectedDayIndex,
} from "./components/week-view"
import { SelectedWorkoutPanel } from "./components/selected-workout-panel"
import { WorkoutDrawer } from "./components/workout-drawer"
import type { Id } from "#convex/_generated/dataModel"
import type { PlanEditorWeek } from "./types"
import { api } from "#convex/_generated/api"
import { EditableTitle } from "@/components/editable-title"
import { Button } from "@/components/ui/button"
import { PlanEditorSkeleton } from "@/components/plan-editor-skeleton"

interface PlanEditorProps {
  planId: Id<"plans">
}

function applyDayWorkoutMove(
  weeks: Array<PlanEditorWeek>,
  weekId: Id<"planWeeks">,
  fromDayIndex: number,
  toDayIndex: number
): Array<PlanEditorWeek> {
  return weeks.map((week) => {
    if (week._id !== weekId) return week

    const sourceSlot = week.slots.find(
      (slot) => slot.dayIndex === fromDayIndex
    )
    const targetSlot = week.slots.find((slot) => slot.dayIndex === toDayIndex)
    if (!sourceSlot?.workout || !targetSlot) return week

    return {
      ...week,
      slots: week.slots.map((slot) => {
        if (slot.dayIndex === fromDayIndex) {
          return {
            ...slot,
            workoutId: targetSlot.workoutId,
            workout: targetSlot.workout,
          }
        }
        if (slot.dayIndex === toDayIndex) {
          return {
            ...slot,
            workoutId: sourceSlot.workoutId,
            workout: sourceSlot.workout,
          }
        }
        return slot
      }),
    }
  })
}

export function PlanEditor({ planId }: PlanEditorProps) {
  const navigate = useNavigate()
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
  const moveDayWorkout = useMutation(
    api.plans.moveDayWorkout
  ).withOptimisticUpdate((localStore, args) => {
    const current = localStore.getQuery(api.plans.get, { planId })
    if (!current) return
    const normalizedWeeks: Array<PlanEditorWeek> = current.weeks.map((week) => ({
      ...week,
      slots: week.slots.map((slot, index) => ({
        ...slot,
        dayIndex: slot.dayIndex ?? index,
      })),
    }))

    localStore.setQuery(
      api.plans.get,
      { planId },
      {
        ...current,
        weeks: applyDayWorkoutMove(
          normalizedWeeks,
          args.weekId,
          args.fromDayIndex,
          args.toDayIndex
        ),
      }
    )
  })

  const [weekIndex, setWeekIndex] = useState(0)
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null)
  const [pickerOpen, setPickerOpen] = useState(false)

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
  const selectedSlot = currentWeek
    ? getDaySlots(currentWeek).find((slot) => slot.dayIndex === selectedDayIndex) ??
      null
    : null
  const pickerMode = selectedSlot?.workout ? "swap" : "add"

  useEffect(() => {
    if (!currentWeek) {
      setSelectedDayIndex(null)
      return
    }

    setSelectedDayIndex(getDefaultSelectedDayIndex(currentWeek))
  }, [currentWeek?._id])

  useEffect(() => {
    if (!currentWeek) return
    const daySlots = getDaySlots(currentWeek)
    const selectedIsValid =
      selectedDayIndex !== null &&
      daySlots.some((slot) => slot.dayIndex === selectedDayIndex)

    if (!selectedIsValid) {
      setSelectedDayIndex(getDefaultSelectedDayIndex(currentWeek))
    }
  }, [currentWeek, selectedDayIndex])

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
    setPickerOpen(false)
    await addWeek({ planId })
    setWeekIndex(displayWeeks.length)
    toast.success("Week added")
  }

  const handleDeleteWeek = async () => {
    if (!currentWeek) return
    setPickerOpen(false)
    await removeWeek({ weekId: currentWeek._id })
    setWeekIndex(Math.max(0, Math.min(safeWeekIndex, displayWeeks.length - 2)))
    toast.success("Week deleted")
  }

  const handleAssign = (workoutId: Id<"workouts">) => {
    if (!currentWeek || selectedDayIndex === null) return
    void assignDayWorkout({
      weekId: currentWeek._id,
      dayIndex: selectedDayIndex,
      workoutId,
    })
    setPickerOpen(false)
  }

  const handleRemoveSelectedWorkout = () => {
    if (!currentWeek || selectedDayIndex === null) return
    void assignDayWorkout({
      weekId: currentWeek._id,
      dayIndex: selectedDayIndex,
      workoutId: null,
    })
    setPickerOpen(false)
    toast.success("Workout removed")
  }

  const handleMoveWorkout = (fromDayIndex: number, toDayIndex: number) => {
    if (!currentWeek || fromDayIndex === toDayIndex) return
    const sourceSlot = getDaySlots(currentWeek).find(
      (slot) => slot.dayIndex === fromDayIndex
    )
    if (!sourceSlot?.workout) return

    void moveDayWorkout({
      weekId: currentWeek._id,
      fromDayIndex,
      toDayIndex,
    })
    setSelectedDayIndex(toDayIndex)
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

      {currentWeek && selectedSlot && (
        <WeekView
          week={currentWeek}
          weekNumber={safeWeekIndex + 1}
          totalWeeks={displayWeeks.length}
          activeDayIndex={selectedDayIndex}
          onSelectDay={(dayIndex) => setSelectedDayIndex(dayIndex)}
          onPrevWeek={() => {
            setPickerOpen(false)
            setWeekIndex((index) => Math.max(0, index - 1))
          }}
          onNextWeek={() => {
            setPickerOpen(false)
            setWeekIndex((index) => Math.min(displayWeeks.length - 1, index + 1))
          }}
          onAddWeek={() => void handleAddWeek()}
          onDeleteWeek={() => void handleDeleteWeek()}
          onMoveWorkout={handleMoveWorkout}
        >
          <SelectedWorkoutPanel
            slot={selectedSlot}
            onOpenPicker={() => setPickerOpen(true)}
            onRemoveWorkout={handleRemoveSelectedWorkout}
            onViewWorkoutDetails={() => {
              if (!selectedSlot.workout) return
              navigate({
                to: "/workout/$id",
                params: { id: selectedSlot.workout._id },
              })
            }}
          />
        </WeekView>
      )}

      <WorkoutDrawer
        open={pickerOpen}
        activeDayIndex={selectedDayIndex ?? 0}
        mode={pickerMode}
        onOpenChange={setPickerOpen}
        onAssign={handleAssign}
      />
    </div>
  )
}
