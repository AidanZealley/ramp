import type { Interval, PowerDisplayMode } from "@/lib/workout-utils"
import type { SelectModifiers } from "../components/interval-block"
import type { HistoryState } from "./history"

export interface WorkoutEditorServerSnapshot {
  intervals: Interval[]
  resetKey: string
  intervalsRevision: number
}

export interface WorkoutEditorStoreProps {
  serverIntervals: Interval[]
  serverResetKey: string
  serverIntervalsRevision: number
  displayMode: PowerDisplayMode
  ftp: number
}

export interface ClipboardPreviewData {
  intervals: Interval[]
  gapBefore: boolean[]
}

export interface WorkoutEditorHistoryEntry {
  intervals: Interval[]
  stableIds: string[]
  selectedIds: string[]
  anchorId: string | null
}

export interface WorkoutEditorActions {
  initializeFromServer: (
    snapshot: WorkoutEditorServerSnapshot & {
      displayMode: PowerDisplayMode
      ftp: number
    }
  ) => void
  receiveServerSnapshot: (snapshot: WorkoutEditorServerSnapshot) => void
  syncExternalConfig: (config: {
    displayMode: PowerDisplayMode
    ftp: number
  }) => void
  resetToBaseline: () => void
  adoptPendingServerSnapshot: () => void
  clearPendingServerSnapshot: () => void
  setDragPreview: (preview: Interval[] | null) => void
  setHoveredIndex: (index: number | null) => void
  setActiveReorderId: (id: string | null) => void
  toggleMultiSelect: () => void
  clearSelection: () => void
  selectAll: () => void
  selectOne: (id: string) => void
  focusSelect: (id: string) => void
  selectWithModifiers: (id: string, mods: SelectModifiers) => void
  copySelection: () => void
  cutSelection: () => void
  pasteClipboard: (insertAtIndex?: number) => void
  deleteSelection: () => void
  deleteIntervals: (ids: string[]) => void
  commitIntervals: (nextIntervals: Interval[]) => void
  insertAt: (index: number) => void
  insertAfterSelectionOrAppend: () => void
  reorderIntervals: (
    oldIndex: number,
    newIndex: number,
    activeId: string
  ) => void
  nudgeSelectedPower: (delta: number) => void
  nudgeSelectedDuration: (delta: number) => void
  undo: () => void
  redo: () => void
}

export interface WorkoutEditorStoreState {
  baselineIntervals: Interval[]
  intervals: Interval[]
  serverResetKey: string
  baselineIntervalsRevision: number
  pendingServerSnapshot: WorkoutEditorServerSnapshot | null
  displayMode: PowerDisplayMode
  ftp: number
  dragPreview: Interval[] | null
  hoveredIndex: number | null
  selectedIds: string[]
  anchorId: string | null
  multiSelectMode: boolean
  clipboardIds: string[]
  activeReorderId: string | null
  stableIds: string[]
  history: HistoryState<WorkoutEditorHistoryEntry>
  historyLimit: number
  actions: WorkoutEditorActions
}
