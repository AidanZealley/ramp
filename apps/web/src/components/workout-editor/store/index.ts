import { useContext, useMemo } from "react"
import { useStore } from "zustand"
import { WorkoutEditorStoreContext } from "./context"
import { buildClipboardPreviewData, isDirtyState } from "./utils"
import type {
  ClipboardPreviewData,
  WorkoutEditorSelectedSectionTarget,
  WorkoutEditorActions,
  WorkoutEditorStoreState,
} from "./types"
import type { Interval } from "@/lib/workout-utils"
import { getWorkoutStats } from "@/lib/workout-utils"

export interface SelectedIntervalRow {
  id: string
  index: number
  interval: Interval
}

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

export const useWorkoutEditorCurrentIntervals = () =>
  useWorkoutEditorStore((state) => state.intervals)

export const useWorkoutEditorBaselineIntervals = () =>
  useWorkoutEditorStore((state) => state.baselineIntervals)

export const useWorkoutEditorDisplayMode = () =>
  useWorkoutEditorStore((state) => state.displayMode)

export const useWorkoutEditorFtp = () =>
  useWorkoutEditorStore((state) => state.ftp)

export const useWorkoutEditorDisplayIntervals = () =>
  useWorkoutEditorStore((state) => state.dragPreview ?? state.intervals)

export const useWorkoutEditorDragPreview = () =>
  useWorkoutEditorStore((state) => state.dragPreview)

export const useWorkoutEditorSelectedIds = () =>
  useWorkoutEditorStore((state) => state.selectedIds)

export const useWorkoutEditorSelectedCount = () =>
  useWorkoutEditorStore((state) => state.selectedIds.length)

export const useWorkoutEditorSelectedSection = () =>
  useWorkoutEditorStore((state) => state.selectedSection)

export const useWorkoutEditorSelectedSectionTarget = () =>
  useWorkoutEditorStore((state) => state.selectedSection?.target ?? null)

export const useWorkoutEditorHasSelectedSection = (stableId: string) =>
  useWorkoutEditorStore(
    (state) => state.selectedSection?.intervalId === stableId
  )

export const useWorkoutEditorIsSelectedSectionTarget = (
  stableId: string,
  target: WorkoutEditorSelectedSectionTarget
) =>
  useWorkoutEditorStore(
    (state) =>
      state.selectedSection?.intervalId === stableId &&
      state.selectedSection.target === target
  )

export const useWorkoutEditorClipboardIds = () =>
  useWorkoutEditorStore((state) => state.clipboardIds)

export const useWorkoutEditorStableIds = () =>
  useWorkoutEditorStore((state) => state.stableIds)

export const useWorkoutEditorHoveredIndex = () =>
  useWorkoutEditorStore((state) => state.hoveredIndex)

export const useWorkoutEditorMultiSelectMode = () =>
  useWorkoutEditorStore((state) => state.multiSelectMode)

export const useWorkoutEditorActiveReorderId = () =>
  useWorkoutEditorStore((state) => state.activeReorderId)

export const useWorkoutEditorActions = (): WorkoutEditorActions =>
  useWorkoutEditorStore((state) => state.actions)

export const useWorkoutEditorClipboardPreview =
  (): ClipboardPreviewData | null => {
    const clipboardIds = useWorkoutEditorClipboardIds()
    const stableIds = useWorkoutEditorStableIds()
    const displayIntervals = useWorkoutEditorDisplayIntervals()

    return useMemo(
      () =>
        buildClipboardPreviewData(clipboardIds, stableIds, displayIntervals),
      [clipboardIds, stableIds, displayIntervals]
    )
  }

export const useWorkoutEditorHasClipboard = () =>
  useWorkoutEditorStore((state) => state.clipboardIds.length > 0)

export const useWorkoutEditorCanCopy = () =>
  useWorkoutEditorStore((state) => state.selectedIds.length > 0)

export const useWorkoutEditorCanUndo = () =>
  useWorkoutEditorStore((state) => state.history.past.length > 0)

export const useWorkoutEditorCanRedo = () =>
  useWorkoutEditorStore((state) => state.history.future.length > 0)

export const useWorkoutEditorIsDirty = () =>
  useWorkoutEditorStore((state) => isDirtyState(state))

export const useWorkoutEditorCanSave = () => useWorkoutEditorIsDirty()

export const useWorkoutEditorCanRevert = () => useWorkoutEditorIsDirty()

export const useWorkoutEditorPendingServerSnapshot = () =>
  useWorkoutEditorStore((state) => state.pendingServerSnapshot)

export const useWorkoutEditorHasIncomingServerChanges = () =>
  useWorkoutEditorStore((state) => state.pendingServerSnapshot !== null)

export const useWorkoutEditorBaselineRevision = () =>
  useWorkoutEditorStore((state) => state.baselineIntervalsRevision)

export const useWorkoutEditorStats = () => {
  const intervals = useWorkoutEditorCurrentIntervals()

  return useMemo(() => getWorkoutStats(intervals), [intervals])
}

export const useWorkoutEditorInterval = (index: number) =>
  useWorkoutEditorStore((state) => {
    const intervals = state.dragPreview ?? state.intervals
    return intervals[index]
  })

export const useWorkoutEditorIsHovered = (index: number) =>
  useWorkoutEditorStore((state) => state.hoveredIndex === index)

export const useWorkoutEditorIsSelected = (stableId: string) =>
  useWorkoutEditorStore((state) => state.selectedIds.includes(stableId))

export const useWorkoutEditorSelectedIntervals = (): Array<SelectedIntervalRow> => {
  const selectedIds = useWorkoutEditorSelectedIds()
  const stableIds = useWorkoutEditorStableIds()
  const intervals = useWorkoutEditorDisplayIntervals()
  return useMemo(() => {
    const idSet = new Set(selectedIds)
    return stableIds
      .map((id, index) =>
        idSet.has(id) ? { id, index, interval: intervals[index] } : null
      )
      .filter((row): row is SelectedIntervalRow => row !== null)
  }, [selectedIds, stableIds, intervals])
}

export { WorkoutEditorStoreProvider } from "./WorkoutStoreProvider"
export type {
  ClipboardPreviewData,
  WorkoutEditorActions,
  WorkoutEditorSelectedSection,
  WorkoutEditorSelectedSectionTarget,
  WorkoutEditorServerSnapshot,
  WorkoutEditorStoreProps,
  WorkoutEditorStoreState,
} from "./types"
