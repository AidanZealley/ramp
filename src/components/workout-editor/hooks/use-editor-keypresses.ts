import { useCallback, useEffect } from "react"
import { useKeypress } from "@/hooks/use-keypress"
import { DURATION_SNAP } from "@/lib/timeline/types"
import { isApplePlatform } from "../utils/platform"
import type { WorkoutEditorActions } from "../store"

interface UseEditorKeypressesProps {
  actions: WorkoutEditorActions
  isDragging: boolean
  selectedCount: number
  stableIdsLength: number
  hasClipboard: boolean
  powerMode: "absolute" | "percentage"
}

export function useEditorKeypresses({
  actions,
  isDragging,
  selectedCount,
  stableIdsLength,
  hasClipboard,
  powerMode,
}: UseEditorKeypressesProps) {
  const powerSnap = powerMode === "absolute" ? 5 : 1
  const applePlatform = isApplePlatform()

  useKeypress(
    "Backspace",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        actions.deleteSelection()
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
        actions.deleteSelection()
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "Escape",
    useCallback(
      (event: KeyboardEvent) => {
        if (selectedCount === 0) return
        event.preventDefault()
        actions.clearSelection()
      },
      [actions, selectedCount]
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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }

      if (isDragging) return

      const key = event.key.toLowerCase()
      const isUndo =
        key === "z" &&
        !event.shiftKey &&
        (applePlatform ? event.metaKey : event.ctrlKey)
      const isRedo =
        (key === "z" &&
          event.shiftKey &&
          (applePlatform ? event.metaKey : event.ctrlKey)) ||
        (!applePlatform && key === "y" && event.ctrlKey)

      if (isUndo) {
        event.preventDefault()
        actions.undo()
        return
      }

      if (isRedo) {
        event.preventDefault()
        actions.redo()
      }
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [actions, applePlatform, isDragging])
}
