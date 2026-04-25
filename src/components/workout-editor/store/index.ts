import { useContext, useMemo } from "react"
import { useStore } from "zustand"
import { WorkoutEditorStoreContext } from "./context"
import { buildClipboardPreviewData } from "./utils"
import type {
  ClipboardPreviewData,
  WorkoutEditorActions,
  WorkoutEditorStoreState,
} from "./types"

function useWorkoutEditorStore<T>(
  selector: (state: WorkoutEditorStoreState) => T
) {
  const store = useContext(WorkoutEditorStoreContext)
  if (!store) {
    throw new Error("WorkoutEditorStoreProvider is missing from the tree")
  }
  return useStore(store, selector)
}

export const useWorkoutEditorIntervals = () =>
  useWorkoutEditorStore((state) => state.intervals)

export const useWorkoutEditorPowerMode = () =>
  useWorkoutEditorStore((state) => state.powerMode)

export const useWorkoutEditorFtp = () =>
  useWorkoutEditorStore((state) => state.ftp)

export const useWorkoutEditorOnIntervalsChange = () =>
  useWorkoutEditorStore((state) => state.onIntervalsChange)

export const useWorkoutEditorDisplayIntervals = () =>
  useWorkoutEditorStore((state) => state.dragPreview ?? state.intervals)

export const useWorkoutEditorDragPreview = () =>
  useWorkoutEditorStore((state) => state.dragPreview)

export const useWorkoutEditorSelectedIds = () =>
  useWorkoutEditorStore((state) => state.selectedIds)

export const useWorkoutEditorSelectedCount = () =>
  useWorkoutEditorStore((state) => state.selectedIds.length)

export const useWorkoutEditorClipboardIds = () =>
  useWorkoutEditorStore((state) => state.clipboardIds)

export const useWorkoutEditorStableIds = () =>
  useWorkoutEditorStore((state) => state.stableIds)

export const useWorkoutEditorHoveredIndex = () =>
  useWorkoutEditorStore((state) => state.hoveredIndex)

export const useWorkoutEditorMultiSelectMode = () =>
  useWorkoutEditorStore((state) => state.multiSelectMode)

export const useWorkoutEditorShowDeleteConfirm = () =>
  useWorkoutEditorStore((state) => state.showDeleteConfirm)

export const useWorkoutEditorActiveReorderId = () =>
  useWorkoutEditorStore((state) => state.activeReorderId)

export const useWorkoutEditorActions = (): WorkoutEditorActions =>
  useWorkoutEditorStore((state) => state.actions)

export const useWorkoutEditorClipboardPreview = (): ClipboardPreviewData | null => {
  const clipboardIds = useWorkoutEditorClipboardIds()
  const stableIds = useWorkoutEditorStableIds()
  const displayIntervals = useWorkoutEditorDisplayIntervals()

  return useMemo(
    () => buildClipboardPreviewData(clipboardIds, stableIds, displayIntervals),
    [clipboardIds, stableIds, displayIntervals]
  )
}

export const useWorkoutEditorHasClipboard = () =>
  useWorkoutEditorStore((state) => state.clipboardIds.length > 0)

export const useWorkoutEditorCanCopy = () =>
  useWorkoutEditorStore((state) => state.selectedIds.length > 0)

export const useWorkoutEditorInterval = (index: number) =>
  useWorkoutEditorStore((state) => {
    const intervals = state.dragPreview ?? state.intervals
    return intervals[index]
  })

export const useWorkoutEditorIsHovered = (index: number) =>
  useWorkoutEditorStore((state) => state.hoveredIndex === index)

export const useWorkoutEditorIsSelected = (stableId: string) =>
  useWorkoutEditorStore((state) => state.selectedIds.includes(stableId))

export { WorkoutEditorStoreProvider } from "./WorkoutStoreProvider"
export type {
  ClipboardPreviewData,
  WorkoutEditorActions,
  WorkoutEditorStoreProps,
  WorkoutEditorStoreState,
} from "./types"
