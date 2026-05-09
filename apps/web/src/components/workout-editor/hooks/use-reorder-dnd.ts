import { useCallback } from "react"
import {
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import type {
  DragCancelEvent,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from "@dnd-kit/core"
import type { WorkoutEditorActions } from "../store"

interface UseReorderDndProps {
  selectedIds: Array<string>
  stableIds: Array<string>
  actions: WorkoutEditorActions
}

function getReorderGroup(
  activeId: string,
  selectedIds: Array<string>,
  stableIds: Array<string>
) {
  if (!selectedIds.includes(activeId)) {
    return stableIds.includes(activeId) ? [activeId] : []
  }

  const selectedIdSet = new Set(selectedIds)
  return stableIds.filter((id) => selectedIdSet.has(id))
}

export function useReorderDnd({
  selectedIds,
  stableIds,
  actions,
}: UseReorderDndProps) {
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
      actions.setActiveReorderOverId(null)
    },
    [actions]
  )

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { active, over } = event
      const activeId = active.id as string
      const overId = over?.id as string | undefined

      if (overId && activeId !== overId) {
        const groupIds = getReorderGroup(activeId, selectedIds, stableIds)
        if (!groupIds.includes(overId)) {
          actions.setActiveReorderOverId(overId)
          return
        }

        actions.setActiveReorderOverId(null)
        return
      }

      actions.setActiveReorderOverId(null)
    },
    [actions, selectedIds, stableIds]
  )

  const handleDragCancel = useCallback(
    (_event: DragCancelEvent) => {
      actions.setActiveReorderId(null)
      actions.setActiveReorderOverId(null)
    },
    [actions]
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) {
        actions.setActiveReorderId(null)
        actions.setActiveReorderOverId(null)
        return
      }

      actions.reorderIntervalsByIds(active.id as string, over.id as string)
    },
    [actions]
  )

  return {
    sensors,
    handleDragStart,
    handleDragOver,
    handleDragCancel,
    handleDragEnd,
  }
}
