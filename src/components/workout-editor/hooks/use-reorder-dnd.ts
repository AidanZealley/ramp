import { useCallback } from "react"
import {
  
  
  PointerSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core"
import type {DragEndEvent, DragStartEvent} from "@dnd-kit/core";
import type { WorkoutEditorActions } from "../store"

interface UseReorderDndProps {
  stableIds: Array<string>
  actions: WorkoutEditorActions
}

export function useReorderDnd({ stableIds, actions }: UseReorderDndProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      actions.setActiveReorderId(event.active.id as string)
    },
    [actions]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        actions.setActiveReorderId(null)
        return
      }

      const oldIndex = stableIds.indexOf(active.id as string)
      const newIndex = stableIds.indexOf(over.id as string)
      actions.reorderIntervals(oldIndex, newIndex, active.id as string)
    },
    [actions, stableIds]
  )

  return { sensors, handleDragStart, handleDragEnd }
}
