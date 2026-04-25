import { useCallback } from "react"
import type { WorkoutEditorActions } from "../store"

interface UseEditorInsertIntervalProps {
  intervalsLength: number
  selectedIds: string[]
  stableIds: string[]
  actions: WorkoutEditorActions
}

export function useEditorInsertInterval({
  intervalsLength,
  selectedIds,
  stableIds,
  actions,
}: UseEditorInsertIntervalProps) {
  return useCallback(() => {
    let insertAt = intervalsLength
    if (selectedIds.length > 0) {
      const rightmost = Math.max(
        ...selectedIds
          .map((id) => stableIds.indexOf(id))
          .filter((index) => index >= 0)
      )
      if (rightmost >= 0) {
        insertAt = rightmost + 1
      }
    }
    actions.insertAt(insertAt)
  }, [actions, intervalsLength, selectedIds, stableIds])
}
