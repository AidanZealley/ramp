import { useCallback, useMemo } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { ArrowLeftRight, Plus } from "lucide-react"
import { getDayFullLabel, getDayShortLabel } from "./utils"
import type { PlanEditorSlot } from "../../types"
import { WorkoutMini } from "@/components/workout-mini"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getWorkoutDisplayMetrics } from "@/lib/workout-metrics"

interface DayCardProps {
  slot: PlanEditorSlot
  previewSlot?: PlanEditorSlot | null
  active: boolean
  onClick: () => void
}

export function DayCard({ slot, previewSlot, active, onClick }: DayCardProps) {
  const displaySlot = previewSlot
    ? {
        ...previewSlot,
        dayIndex: slot.dayIndex,
      }
    : slot
  const workout = slot.workout
  const metrics = useMemo(
    () =>
      displaySlot.workout
        ? getWorkoutDisplayMetrics(displaySlot.workout.intervals)
        : null,
    [displaySlot.workout]
  )
  const dragId = `plan-day:${slot.weekId}:${slot.dayIndex}`
  const {
    attributes,
    isDragging,
    listeners,
    setNodeRef: setDraggableNodeRef,
  } = useDraggable({
    id: dragId,
    data: {
      dayIndex: slot.dayIndex,
      workoutId: slot.workoutId,
    },
    disabled: !workout,
  })
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: dragId,
    data: {
      dayIndex: slot.dayIndex,
      workoutId: slot.workoutId,
    },
  })
  const setNodeRef = useCallback(
    (node: HTMLButtonElement | null) => {
      setDraggableNodeRef(node)
      setDroppableNodeRef(node)
    },
    [setDraggableNodeRef, setDroppableNodeRef]
  )
  const isSwapTarget = isOver && !isDragging && workout !== null
  const isMoveTarget = isOver && !isDragging && workout === null
  const isSwapPreview = Boolean(previewSlot?.workout)

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onClick}
      aria-pressed={active}
      aria-label={
        workout
          ? `Select ${getDayFullLabel(slot.dayIndex)}, ${workout.title} assigned`
          : `Select ${getDayFullLabel(slot.dayIndex)}, no workout assigned`
      }
      className={cn(
        "relative flex min-h-44 w-full flex-col rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30",
        !workout && "border-dashed bg-muted/15",
        workout && "cursor-grab active:cursor-grabbing",
        active && "border-primary ring-2 ring-primary/30",
        isMoveTarget && "border-primary bg-primary/5 ring-2 ring-primary/20",
        isSwapTarget &&
          "border-primary bg-primary/10 ring-2 ring-primary/30",
        isDragging && !isSwapPreview && "cursor-grabbing border-primary/70 bg-primary/5",
        isSwapPreview &&
          "cursor-grabbing border-primary bg-primary/10 ring-2 ring-primary/30",
      )}
    >
      {(isSwapTarget || isSwapPreview) && (
        <Badge
          variant="outline"
          className="absolute top-2 right-2 flex items-center gap-1 bg-background/95 px-2 py-0.5 text-[11px] leading-none shadow-sm"
        >
          <ArrowLeftRight className="size-3" />
          Swap
        </Badge>
      )}
      <DayCardContent slot={displaySlot} metrics={metrics} />
    </button>
  )
}

export function DayCardDragOverlay({ slot }: { slot: PlanEditorSlot }) {
  const metrics = useMemo(
    () => (slot.workout ? getWorkoutDisplayMetrics(slot.workout.intervals) : null),
    [slot.workout]
  )

  return (
    <div className="flex min-h-44 w-full min-w-32 rotate-1 cursor-grabbing flex-col rounded-xl border border-primary/70 bg-card p-3 text-left shadow-xl">
      <DayCardContent slot={slot} metrics={metrics} />
    </div>
  )
}

function DayCardContent({
  slot,
  metrics,
}: {
  slot: PlanEditorSlot
  metrics: ReturnType<typeof getWorkoutDisplayMetrics> | null
}) {
  const workout = slot.workout

  return (
    <>
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {getDayShortLabel(slot.dayIndex)}
      </div>

      {workout && metrics ? (
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <WorkoutMini
            intervals={workout.intervals}
            className="h-14 w-full rounded-md bg-muted/40"
            compact
          />
          <div className="line-clamp-2 text-sm leading-snug font-medium">
            {workout.title}
          </div>
          <div className="mt-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{metrics.durationLabel}</span>
            <span aria-hidden>·</span>
            <span>{metrics.stressScore} TSS</span>
            <Badge
              variant="outline"
              className="ml-auto"
              style={{
                color: metrics.zoneInfo.color,
                borderColor: metrics.zoneInfo.colorMuted,
              }}
            >
              {metrics.zoneLabel}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Plus className="size-4" />
          Add workout
        </div>
      )}
    </>
  )
}
