import { useCallback, useEffect } from "react"
import { isApplePlatform } from "../utils/platform"
import type { WorkoutEditorActions } from "../store"
import { useKeypress } from "@/hooks/use-keypress"
import { DURATION_SNAP } from "@/lib/timeline/types"

interface UseEditorKeypressesProps {
  actions: WorkoutEditorActions
  isDragging: boolean
  selectedCount: number
  hasSelectedSection: boolean
  stableIdsLength: number
  hasClipboard: boolean
}

export function useEditorKeypresses({
  actions,
  isDragging,
  selectedCount,
  hasSelectedSection,
  stableIdsLength,
  hasClipboard,
}: UseEditorKeypressesProps) {
  const powerSnap = 1
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
        if (hasSelectedSection) {
          actions.clearSelectedSection()
          return
        }
        actions.clearSelection()
      },
      [actions, hasSelectedSection, selectedCount]
    )
  )

  useKeypress(
    "Enter",
    useCallback(
      (event: KeyboardEvent) => {
        if (!hasSelectedSection) return
        event.preventDefault()
        actions.clearSelectedSection()
      },
      [actions, hasSelectedSection]
    )
  )

  useKeypress(
    " ",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount !== 1) return
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
          return
        }

        event.preventDefault()
        actions.enterSelectedSectionMode()
      },
      [actions, isDragging, selectedCount]
    )
  )

  useKeypress(
    "Tab",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount !== 1 || !hasSelectedSection) return
        if (event.metaKey || event.ctrlKey || event.altKey) return

        event.preventDefault()
        actions.cycleSelectedSection(event.shiftKey ? -1 : 1)
      },
      [actions, hasSelectedSection, isDragging, selectedCount]
    )
  )

  useKeypress(
    "ArrowUp",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        if (hasSelectedSection) {
          actions.nudgeSelectedSectionPower(powerSnap)
          return
        }
        actions.nudgeSelectedPower(powerSnap)
      },
      [actions, hasSelectedSection, isDragging, powerSnap, selectedCount]
    )
  )

  useKeypress(
    "ArrowDown",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        if (hasSelectedSection) {
          actions.nudgeSelectedSectionPower(-powerSnap)
          return
        }
        actions.nudgeSelectedPower(-powerSnap)
      },
      [actions, hasSelectedSection, isDragging, powerSnap, selectedCount]
    )
  )

  useKeypress(
    "ArrowRight",
    useCallback(
      (event: KeyboardEvent) => {
        if (isDragging || selectedCount === 0) return
        event.preventDefault()
        if (event.altKey) {
          if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
            actions.moveSelection(1)
          }
          return
        }
        if (event.shiftKey) {
          actions.extendSelection(1)
          return
        }
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
        if (event.altKey) {
          if (!event.shiftKey && !event.metaKey && !event.ctrlKey) {
            actions.moveSelection(-1)
          }
          return
        }
        if (event.shiftKey) {
          actions.extendSelection(-1)
          return
        }
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
