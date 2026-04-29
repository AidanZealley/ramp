import { getWorkoutStats, type Interval } from "@/lib/workout-utils"
import type {
  ClipboardPreviewData,
  WorkoutEditorHistoryEntry,
  WorkoutEditorServerSnapshot,
  WorkoutEditorStoreProps,
  WorkoutEditorStoreState,
} from "./types"
import { createHistory } from "./history"

export const DEFAULT_HISTORY_LIMIT = 100

let idCounter = 0

export const newWorkoutEditorId = () =>
  globalThis.crypto?.randomUUID?.() ?? `workout-editor-${++idCounter}`

export function cloneIntervals(intervals: Interval[]) {
  return intervals.map((interval) => ({ ...interval }))
}

export function getDisplayIntervals(state: WorkoutEditorStoreState) {
  return state.dragPreview ?? state.intervals
}

export function areIntervalsEqual(a: Interval[], b: Interval[]) {
  if (a === b) return true
  if (a.length !== b.length) return false

  return a.every((interval, index) => {
    const other = b[index]
    return (
      interval.startPower === other?.startPower &&
      interval.endPower === other?.endPower &&
      interval.durationSeconds === other?.durationSeconds
    )
  })
}

export function isDirtyState(state: Pick<
  WorkoutEditorStoreState,
  "intervals" | "baselineIntervals"
>) {
  return !areIntervalsEqual(state.intervals, state.baselineIntervals)
}

function normalizeStableIds(stableIds: string[], nextLength: number): string[] {
  const trimmed = stableIds.slice(0, nextLength)
  const seen = new Set<string>()
  const normalized = trimmed.map((id) => {
    if (!id || seen.has(id)) {
      const replacement = newWorkoutEditorId()
      seen.add(replacement)
      return replacement
    }
    seen.add(id)
    return id
  })

  if (normalized.length < nextLength) {
    normalized.push(
      ...Array.from({ length: nextLength - normalized.length }, () =>
        newWorkoutEditorId()
      )
    )
  }

  return normalized
}

export function reconcileStableIds(
  stableIds: string[],
  nextLength: number
): string[] {
  return normalizeStableIds(stableIds, nextLength)
}

export function cleanupState(
  state: WorkoutEditorStoreState,
  nextStableIds: string[],
  nextIntervals: Interval[]
) {
  const liveIdSet = new Set(nextStableIds)
  const selectedIds = state.selectedIds.filter((id) => liveIdSet.has(id))
  const clipboardIds = state.clipboardIds.filter((id) => liveIdSet.has(id))
  const anchorId =
    state.anchorId && liveIdSet.has(state.anchorId) ? state.anchorId : null
  const activeReorderId =
    state.activeReorderId && liveIdSet.has(state.activeReorderId)
      ? state.activeReorderId
      : null
  const hoveredIndex =
    state.hoveredIndex !== null && state.hoveredIndex < nextIntervals.length
      ? state.hoveredIndex
      : null
  const dragPreview =
    state.dragPreview && state.dragPreview.length === nextIntervals.length
      ? state.dragPreview
      : null

  return {
    selectedIds,
    clipboardIds,
    anchorId,
    activeReorderId,
    hoveredIndex,
    dragPreview,
  }
}

export function createHistoryEntry(
  intervals: Interval[],
  stableIds: string[],
  selectedIds: string[],
  anchorId: string | null
): WorkoutEditorHistoryEntry {
  return {
    intervals,
    stableIds,
    selectedIds,
    anchorId,
  }
}

export function createServerSnapshotFromProps(
  props: WorkoutEditorStoreProps
): WorkoutEditorServerSnapshot {
  return {
    intervals: cloneIntervals(props.serverIntervals),
    resetKey: props.serverResetKey,
    intervalsRevision: props.serverIntervalsRevision,
  }
}

export function createSessionState(
  snapshot: WorkoutEditorServerSnapshot,
  config: Pick<WorkoutEditorStoreState, "displayMode" | "ftp">,
  stableIds?: string[]
): Omit<WorkoutEditorStoreState, "actions"> {
  const baselineIntervals = cloneIntervals(snapshot.intervals)
  const intervals = cloneIntervals(snapshot.intervals)
  const nextStableIds = stableIds
    ? reconcileStableIds(stableIds, intervals.length)
    : intervals.map(() => newWorkoutEditorId())
  const present = createHistoryEntry(intervals, nextStableIds, [], null)

  return {
    baselineIntervals,
    intervals,
    serverResetKey: snapshot.resetKey,
    baselineIntervalsRevision: snapshot.intervalsRevision,
    pendingServerSnapshot: null,
    displayMode: config.displayMode,
    ftp: config.ftp,
    dragPreview: null,
    hoveredIndex: null,
    selectedIds: [],
    anchorId: null,
    multiSelectMode: false,
    clipboardIds: [],
    activeReorderId: null,
    stableIds: nextStableIds,
    historyLimit: DEFAULT_HISTORY_LIMIT,
    history: createHistory(present, DEFAULT_HISTORY_LIMIT),
  }
}

export function createInitialState(
  props: WorkoutEditorStoreProps
): Omit<WorkoutEditorStoreState, "actions"> {
  return createSessionState(createServerSnapshotFromProps(props), {
    displayMode: props.displayMode,
    ftp: props.ftp,
  })
}

export function buildClipboardPreviewData(
  clipboardIds: string[],
  stableIds: string[],
  displayIntervals: Interval[]
): ClipboardPreviewData | null {
  if (clipboardIds.length === 0) return null

  const intervals: Interval[] = []
  const sourceIndices: number[] = []

  for (const id of clipboardIds) {
    const index = stableIds.indexOf(id)
    if (index !== -1) {
      intervals.push(displayIntervals[index])
      sourceIndices.push(index)
    }
  }

  if (intervals.length === 0) return null

  return {
    intervals,
    gapBefore: sourceIndices.map((sourceIndex, index) =>
      index > 0 ? sourceIndex !== sourceIndices[index - 1] + 1 : false
    ),
  }
}

export function getStatsForIntervals(intervals: Interval[]) {
  return getWorkoutStats(intervals)
}
