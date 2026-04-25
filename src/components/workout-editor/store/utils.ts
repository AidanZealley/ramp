import type { Interval } from "@/lib/workout-utils"
import type {
  ClipboardPreviewData,
  WorkoutEditorStoreProps,
  WorkoutEditorStoreState,
} from "./types"

let idCounter = 0

export const newWorkoutEditorId = () =>
  globalThis.crypto?.randomUUID?.() ?? `workout-editor-${++idCounter}`

export function getDisplayIntervals(state: WorkoutEditorStoreState) {
  return state.dragPreview ?? state.intervals
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
  const showDeleteConfirm =
    state.showDeleteConfirm && selectedIds.length > 1
      ? state.showDeleteConfirm
      : false
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
    showDeleteConfirm,
    dragPreview,
  }
}

export function createInitialState(
  props: WorkoutEditorStoreProps
): Omit<WorkoutEditorStoreState, "actions"> {
  return {
    ...props,
    dragPreview: null,
    hoveredIndex: null,
    selectedIds: [],
    anchorId: null,
    multiSelectMode: false,
    clipboardIds: [],
    showDeleteConfirm: false,
    activeReorderId: null,
    stableIds: props.intervals.map(() => newWorkoutEditorId()),
  }
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
