import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { ArrowLeft, Plus } from "lucide-react"
import { api } from "#convex/_generated/api"
import { PlanScheduleGrid } from "./components/plan-schedule-grid"
import { PlanActionsMenu } from "./components/plan-actions-menu"
import { SelectWorkoutsDialog } from "./components/select-workouts-dialog"
import type { Id } from "#convex/_generated/dataModel"
import type { PlanEditorWeek } from "./types"
import { EditableTitle } from "@/components/editable-title"
import { Button } from "@/components/ui/button"
import { PlanEditorSkeleton } from "@/components/plan-editor-skeleton"

interface PlanEditorProps {
  planId: Id<"plans">
}

export function PlanEditor({ planId }: PlanEditorProps) {
  const navigate = useNavigate()
  const plan = useQuery(api.plans.get, { planId })
  const updateTitle = useMutation(api.plans.updateTitle)
  const addWeek = useMutation(api.plans.addWeek)
  const removeWeek = useMutation(api.plans.removeWeek)
  const duplicatePlan = useMutation(api.plans.duplicatePlan)
  const removePlan = useMutation(api.plans.remove)

  const [selectionState, setSelectionState] = useState<{
    weekId: Id<"planWeeks">
    dayIndex: number
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

  const selectedWeek = useMemo(() => {
    if (!selectionState) return null
    return (
      displayWeeks.find((week) => week._id === selectionState.weekId) ?? null
    )
  }, [displayWeeks, selectionState])

  const selectedWeekNumber = useMemo(() => {
    if (!selectedWeek) return 1
    return displayWeeks.findIndex((week) => week._id === selectedWeek._id) + 1
  }, [displayWeeks, selectedWeek])

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
    await addWeek({ planId })
    toast.success("Week added")
  }

  const handleDeleteWeek = async (weekId: Id<"planWeeks">) => {
    await removeWeek({ weekId })
    toast.success("Week deleted")
  }

  const openWeekDialog = (week: PlanEditorWeek, dayIndex = 0) => {
    setSelectionState({ weekId: week._id, dayIndex })
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

      <PlanScheduleGrid
        weeks={displayWeeks}
        onSelectWeek={(week) => openWeekDialog(week)}
        onSelectDay={(week, dayIndex) => openWeekDialog(week, dayIndex)}
        onDeleteWeek={(weekId) => void handleDeleteWeek(weekId)}
      />

      <Button
        variant="outline"
        className="w-full"
        onClick={() => void handleAddWeek()}
      >
        <Plus className="size-4" />
        Add Week
      </Button>

      <SelectWorkoutsDialog
        open={selectionState !== null}
        onOpenChange={(open) => {
          if (!open) setSelectionState(null)
        }}
        week={selectedWeek}
        weekNumber={selectedWeekNumber}
        initialDayIndex={selectionState?.dayIndex ?? 0}
      />
    </div>
  )
}
