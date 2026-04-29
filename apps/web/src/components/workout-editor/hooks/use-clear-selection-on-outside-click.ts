import { useEffect } from "react"
import type { WorkoutEditorActions } from "../store"

interface UseClearSelectionOnOutsideClickProps {
  editorRef: React.RefObject<HTMLDivElement | null>
  actions: WorkoutEditorActions
}

export function useClearSelectionOnOutsideClick({
  editorRef,
  actions,
}: UseClearSelectionOnOutsideClickProps) {
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (editorRef.current && editorRef.current.contains(target)) return
      if (target && target.closest("[data-selection-toolbar]")) return
      if (target && target.closest("[data-editor-action]")) return
      actions.clearSelection()
    }

    document.addEventListener("click", handleDocumentClick)
    return () => document.removeEventListener("click", handleDocumentClick)
  }, [actions, editorRef])
}
