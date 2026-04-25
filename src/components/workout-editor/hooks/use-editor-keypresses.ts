import { useCallback } from "react"
import { useKeypress } from "@/hooks/use-keypress"
import { DURATION_SNAP } from "@/lib/timeline/types"
import type { WorkoutEditorActions } from "../store"

interface UseEditorKeypressesProps {
  actions: WorkoutEditorActions
  isDragging: boolean
  selectedCount: number
  stableIdsLength: number
  hasClipboard: boolean
  showDeleteConfirm: boolean
  powerMode: "absolute" | "percentage"
}

export function useEditorKeypresses({
  actions,
  isDragging,
  selectedCount,
  stableIdsLength,
  hasClipboard,
  showDeleteConfirm,
  powerMode,
}: UseEditorKeypressesProps) {
  const powerSnap = powerMode === "absolute" ? 5 : 1

  useKeypress(
    "Backspace",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.requestDelete()
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "Delete",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.requestDelete()
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "Escape",
    useCallback(
      (event: KeyboardEvent) => {
        if (showDeleteConfirm) {
          event.preventDefault()
          actions.cancelDelete()
          return
        }
        if (selectedCount === 0) return
        event.preventDefault()
        actions.clearSelection()
      },
      [actions, selectedCount, showDeleteConfirm]
    )
  )

  useKeypress(
    "ArrowUp",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.nudgeSelectedPower(powerSnap)
      },
      [actions, isDragging, powerSnap, selectedCount]
    )
  )

  useKeypress(
    "ArrowDown",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.nudgeSelectedPower(-powerSnap)
      },
      [actions, isDragging, powerSnap, selectedCount]
    )
  )

  useKeypress(
    "ArrowRight",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.nudgeSelectedDuration(DURATION_SNAP)
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "ArrowLeft",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.nudgeSelectedDuration(-DURATION_SNAP)
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "c",
    useCallback(
      (event: KeyboardEvent) => {
        if (!(event.metaKey || event.ctrlKey)) return
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.copySelection()
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "v",
    useCallback(
      (event: KeyboardEvent) => {
        if (!(event.metaKey || event.ctrlKey)) return
        if (isDragging || !hasClipboard) return
        event.preventDefault()
        actions.pasteClipboard()
      },
      [actions, hasClipboard, isDragging]
    )
  )

  useKeypress(
    "x",
    useCallback(
      (event: KeyboardEvent) => {
        if (!(event.metaKey || event.ctrlKey)) return
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.cutSelection()
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "a",
    useCallback(
      (event: KeyboardEvent) => {
        if (!(event.metaKey || event.ctrlKey)) return
        if (isDragging || stableIdsLength === 0) return
        event.preventDefault()
        actions.selectAll()
      },
      [actions, isDragging, stableIdsLength]
    )
  )
}
