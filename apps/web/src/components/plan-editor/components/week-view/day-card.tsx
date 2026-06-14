import { useCallback, useMemo } from "react"
import { useDraggable, useDroppable } from "@dnd-kit/core"
import { Plus } from "lucide-react"
import { getDayFullLabel, getDayShortLabel } from "./utils"
import type { PlanEditorSlot } from "../../types"
import { WorkoutMini } from "@/components/workout-mini"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { getWorkoutDisplayMetrics } from "@/lib/workout-metrics"

interface DayCardProps {
  slot: PlanEditorSlot
  active: boolean
  onClick: () => void
}

export function DayCard({ slot, active, onClick }: DayCardProps) {
  const workout = slot.workout
  const metrics = useMemo(
    () => (workout ? getWorkoutDisplayMetrics(workout.intervals) : null),
    [workout]
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
        "flex min-h-44 w-full flex-col rounded-xl border border-border/60 bg-card p-3 text-left transition-colors hover:border-primary/50 hover:bg-muted/30",
        !workout && "border-dashed bg-muted/15",
        workout && "cursor-grab active:cursor-grabbing",
        active && "border-primary ring-2 ring-primary/30",
        isOver &&
          !isDragging &&
          "border-primary bg-primary/5 ring-2 ring-primary/20",
        isDragging && "border-primary/70 bg-primary/5"
      )}
    >
      <DayCardContent slot={slot} metrics={metrics} />
    </button>
  )
}

export function DayCardDragOverlay({ slot }: { slot: PlanEditorSlot }) {
  const metrics = useMemo(
    () => (slot.workout ? getWorkoutDisplayMetrics(slot.workout.intervals) : null),
    [slot.workout]
  )

  return (
    <div className="flex min-h-44 w-full min-w-32 rotate-1 flex-col rounded-xl border border-primary/70 bg-card p-3 text-left shadow-xl">
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
