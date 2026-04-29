import { arrayMove } from "@dnd-kit/sortable"
import { createStore } from "zustand"
import type { Interval } from "@/lib/workout-utils"
import { clamp, computeMaxPower } from "@/lib/workout-utils"
import { MIN_DURATION, MIN_POWER } from "@/lib/timeline/types"
import { pushHistory, redoHistory, resetHistory, undoHistory } from "./history"
import {
  areIntervalsEqual,
  cleanupState,
  cloneIntervals,
  createHistoryEntry,
  createInitialState,
  createSessionState,
  getDisplayIntervals,
  isDirtyState,
  newWorkoutEditorId,
  reconcileStableIds,
} from "./utils"
import type {
  WorkoutEditorHistoryEntry,
  WorkoutEditorServerSnapshot,
  WorkoutEditorStoreProps,
  WorkoutEditorStoreState,
} from "./types"

function areHistoryEntriesEqual(
  a: WorkoutEditorHistoryEntry,
  b: WorkoutEditorHistoryEntry
) {
  return (
    areIntervalsEqual(a.intervals, b.intervals) &&
    a.anchorId === b.anchorId &&
    a.selectedIds.length === b.selectedIds.length &&
    a.selectedIds.every((id, index) => id === b.selectedIds[index]) &&
    a.stableIds.length === b.stableIds.length &&
    a.stableIds.every((id, index) => id === b.stableIds[index])
  )
}

function buildPresentFromState(state: WorkoutEditorStoreState) {
  return createHistoryEntry(
    state.intervals,
    state.stableIds,
    state.selectedIds,
    state.anchorId
  )
}

function applyPresent(
  state: WorkoutEditorStoreState,
  present: WorkoutEditorHistoryEntry
) {
  const cleaned = cleanupState(
    {
      ...state,
      selectedIds: present.selectedIds,
      anchorId: present.anchorId,
      stableIds: present.stableIds,
      intervals: present.intervals,
    },
    present.stableIds,
    present.intervals
  )
  const nextSelectedIds = cleaned.selectedIds
  const nextAnchorId =
    present.anchorId && nextSelectedIds.includes(present.anchorId)
      ? present.anchorId
      : cleaned.anchorId

  return {
    intervals: present.intervals,
    stableIds: present.stableIds,
    selectedIds: nextSelectedIds,
    anchorId: nextAnchorId,
    clipboardIds: cleaned.clipboardIds,
    dragPreview: null,
    hoveredIndex: null,
    activeReorderId: null,
  }
}

function initializeSessionState(
  state: WorkoutEditorStoreState,
  snapshot: WorkoutEditorServerSnapshot,
  config?: Pick<WorkoutEditorStoreState, "displayMode" | "ftp">
) {
  const nextState = createSessionState(
    {
      intervals: cloneIntervals(snapshot.intervals),
      resetKey: snapshot.resetKey,
      intervalsRevision: snapshot.intervalsRevision,
    },
    {
      displayMode: config?.displayMode ?? state.displayMode,
      ftp: config?.ftp ?? state.ftp,
    }
  )

  return {
    ...state,
    ...nextState,
    historyLimit: state.historyLimit,
  }
}

export function createWorkoutEditorStore(props: WorkoutEditorStoreProps) {
  return createStore<WorkoutEditorStoreState>()((set, get) => {
    const commitHistoryEntry = (nextPresent: WorkoutEditorHistoryEntry) => {
      const state = get()
      const currentPresent = buildPresentFromState(state)
      const history = areHistoryEntriesEqual(currentPresent, nextPresent)
        ? state.history
        : pushHistory(
            {
              ...state.history,
              present: currentPresent,
            },
            nextPresent,
            state.historyLimit
          )

      if (history === state.history) return

      set({
        history,
        ...applyPresent(state, history.present),
      })
    }

    return {
      ...createInitialState(props),
      actions: {
        initializeFromServer: (snapshot) => {
          set((state) =>
            initializeSessionState(state, snapshot, {
              displayMode: snapshot.displayMode,
              ftp: snapshot.ftp,
            })
          )
        },
        receiveServerSnapshot: (snapshot) => {
          set((state) => {
            if (snapshot.resetKey === state.serverResetKey) {
              return state
            }

            if (!isDirtyState(state)) {
              return initializeSessionState(state, snapshot)
            }

            return {
              pendingServerSnapshot: {
                intervals: cloneIntervals(snapshot.intervals),
                resetKey: snapshot.resetKey,
                intervalsRevision: snapshot.intervalsRevision,
              },
            }
          })
        },
        syncExternalConfig: ({ displayMode, ftp }) => {
          set((state) => {
            if (state.displayMode === displayMode && state.ftp === ftp) {
              return state
            }

            return { displayMode, ftp }
          })
        },
        resetToBaseline: () => {
          set((state) => {
            const intervals = cloneIntervals(state.baselineIntervals)
            const stableIds = reconcileStableIds([], intervals.length)
            const present = createHistoryEntry(intervals, stableIds, [], null)

            return {
              intervals,
              stableIds,
              selectedIds: [],
              anchorId: null,
              dragPreview: null,
              hoveredIndex: null,
              activeReorderId: null,
              history: resetHistory(present),
            }
          })
        },
        adoptPendingServerSnapshot: () => {
          set((state) => {
            if (!state.pendingServerSnapshot) return state
            return initializeSessionState(state, state.pendingServerSnapshot)
          })
        },
        clearPendingServerSnapshot: () => {
          set((state) =>
            state.pendingServerSnapshot === null
              ? state
              : { pendingServerSnapshot: null }
          )
        },
        setDragPreview: (preview) => {
          set({ dragPreview: preview })
        },
        setHoveredIndex: (index) => {
          set({ hoveredIndex: index })
        },
        setActiveReorderId: (id) => {
          set({ activeReorderId: id })
        },
        toggleMultiSelect: () => {
          set((state) => ({ multiSelectMode: !state.multiSelectMode }))
        },
        clearSelection: () => {
          set({
            selectedIds: [],
            anchorId: null,
          })
        },
        selectAll: () => {
          set((state) => ({ selectedIds: [...state.stableIds] }))
        },
        selectOne: (id) => {
          set({ selectedIds: [id], anchorId: id })
        },
        focusSelect: (id) => {
          set({ selectedIds: [id], anchorId: id })
        },
        selectWithModifiers: (id, mods) => {
          set((state) => {
            if (mods.shift) {
              const effectiveAnchor =
                state.anchorId !== null &&
                state.stableIds.indexOf(state.anchorId) !== -1
                  ? state.anchorId
                  : (state.selectedIds[state.selectedIds.length - 1] ?? id)
              const a = state.stableIds.indexOf(effectiveAnchor)
              const b = state.stableIds.indexOf(id)
              if (a !== -1 && b !== -1) {
                const [from, to] = a < b ? [a, b] : [b, a]
                return {
                  selectedIds: state.stableIds.slice(from, to + 1),
                  anchorId:
                    state.anchorId === null ||
                    state.stableIds.indexOf(state.anchorId) === -1
                      ? effectiveAnchor
                      : state.anchorId,
                }
              }
            }

            if (mods.meta || state.multiSelectMode) {
              return {
                selectedIds: state.selectedIds.includes(id)
                  ? state.selectedIds.filter((x) => x !== id)
                  : [...state.selectedIds, id],
                anchorId: id,
              }
            }

            return {
              selectedIds:
                state.selectedIds.length === 1 && state.selectedIds[0] === id
                  ? []
                  : [id],
              anchorId: id,
            }
          })
        },
        copySelection: () => {
          set((state) => {
            if (state.selectedIds.length === 0) return {}
            const selectedIdSet = new Set(state.selectedIds)
            return {
              clipboardIds: state.stableIds.filter((id) =>
                selectedIdSet.has(id)
              ),
            }
          })
        },
        cutSelection: () => {
          const { actions, selectedIds } = get()
          if (selectedIds.length === 0) return
          actions.copySelection()
          actions.deleteSelection()
        },
        pasteClipboard: (insertAtIndex) => {
          const state = get()
          if (state.clipboardIds.length === 0) return

          const toPaste: Interval[] = []
          for (const id of state.clipboardIds) {
            const idx = state.stableIds.indexOf(id)
            if (idx !== -1) {
              toPaste.push(state.intervals[idx])
            }
          }
          if (toPaste.length === 0) return

          let insertAt: number
          if (insertAtIndex !== undefined) {
            insertAt = insertAtIndex
          } else if (state.selectedIds.length > 0) {
            const rightmost = Math.max(
              ...state.selectedIds
                .map((id) => state.stableIds.indexOf(id))
                .filter((index) => index >= 0)
            )
            insertAt = rightmost >= 0 ? rightmost + 1 : state.intervals.length
          } else {
            insertAt = state.intervals.length
          }

          const newIds = toPaste.map(() => newWorkoutEditorId())
          const nextStableIds = [...state.stableIds]
          const nextIntervals = [...state.intervals]
          nextStableIds.splice(insertAt, 0, ...newIds)
          nextIntervals.splice(insertAt, 0, ...toPaste)

          commitHistoryEntry(
            createHistoryEntry(
              nextIntervals,
              nextStableIds,
              newIds,
              newIds[newIds.length - 1] ?? null
            )
          )
        },
        deleteSelection: () => {
          const { actions, selectedIds } = get()
          if (selectedIds.length === 0) return
          actions.deleteIntervals(selectedIds)
        },
        deleteIntervals: (ids) => {
          if (ids.length === 0) return

          const state = get()
          const toDelete = new Set(ids)
          const keepMask = state.stableIds.map((id) => !toDelete.has(id))
          const stableIds = state.stableIds.filter((_, index) => keepMask[index])
          const intervals = state.intervals.filter((_, index) => keepMask[index])

          commitHistoryEntry(createHistoryEntry(intervals, stableIds, [], null))
        },
        commitIntervals: (nextIntervals) => {
          const state = get()
          const stableIds =
            nextIntervals.length === state.intervals.length
              ? state.stableIds
              : reconcileStableIds(state.stableIds, nextIntervals.length)

          commitHistoryEntry(
            createHistoryEntry(
              nextIntervals,
              stableIds,
              state.selectedIds.filter((id) => stableIds.includes(id)),
              state.anchorId && stableIds.includes(state.anchorId)
                ? state.anchorId
                : null
            )
          )
        },
        insertAt: (index) => {
          const state = get()
          const displayIntervals = getDisplayIntervals(state)
          const prev = displayIntervals[index - 1]
          const next = displayIntervals[index]
          const defaultPower = 75

          const newInterval: Interval = {
            startPower: prev
              ? prev.endPower
              : (next?.startPower ?? defaultPower),
            endPower: next ? next.startPower : (prev?.endPower ?? defaultPower),
            durationSeconds: 300,
          }

          const freshId = newWorkoutEditorId()
          const nextStableIds = [...state.stableIds]
          const nextIntervals = [...state.intervals]
          nextStableIds.splice(index, 0, freshId)
          nextIntervals.splice(index, 0, newInterval)

          commitHistoryEntry(
            createHistoryEntry(nextIntervals, nextStableIds, [freshId], freshId)
          )
        },
        insertAfterSelectionOrAppend: () => {
          const state = get()
          let insertAt = state.intervals.length

          if (state.selectedIds.length > 0) {
            const rightmost = Math.max(
              ...state.selectedIds
                .map((id) => state.stableIds.indexOf(id))
                .filter((index) => index >= 0)
            )

            if (rightmost >= 0) {
              insertAt = rightmost + 1
            }
          }

          state.actions.insertAt(insertAt)
        },
        reorderIntervals: (oldIndex, newIndex, activeId) => {
          const state = get()
          if (
            oldIndex === -1 ||
            newIndex === -1 ||
            oldIndex >= state.intervals.length ||
            newIndex >= state.intervals.length
          ) {
            return
          }

          commitHistoryEntry(
            createHistoryEntry(
              arrayMove([...state.intervals], oldIndex, newIndex),
              arrayMove([...state.stableIds], oldIndex, newIndex),
              [activeId],
              activeId
            )
          )
        },
        nudgeSelectedPower: (delta) => {
          const state = get()
          if (state.selectedIds.length === 0) return
          const maxPower = computeMaxPower(state.intervals)
          const updated = [...state.intervals]
          for (const id of state.selectedIds) {
            const index = state.stableIds.indexOf(id)
            if (index === -1) continue
            const interval = updated[index]
            updated[index] = {
              ...interval,
              startPower: clamp(
                interval.startPower + delta,
                MIN_POWER,
                maxPower
              ),
              endPower: clamp(interval.endPower + delta, MIN_POWER, maxPower),
            }
          }

          commitHistoryEntry(
            createHistoryEntry(
              updated,
              state.stableIds,
              state.selectedIds,
              state.anchorId
            )
          )
        },
        nudgeSelectedDuration: (delta) => {
          const state = get()
          if (state.selectedIds.length === 0) return
          const updated = [...state.intervals]
          for (const id of state.selectedIds) {
            const index = state.stableIds.indexOf(id)
            if (index === -1) continue
            const interval = updated[index]
            updated[index] = {
              ...interval,
              durationSeconds: Math.max(
                MIN_DURATION,
                interval.durationSeconds + delta
              ),
            }
          }

          commitHistoryEntry(
            createHistoryEntry(
              updated,
              state.stableIds,
              state.selectedIds,
              state.anchorId
            )
          )
        },
        undo: () => {
          const state = get()
          const history = undoHistory(state.history)
          if (!history) return

          set({
            history,
            ...applyPresent(state, history.present),
          })
        },
        redo: () => {
          const state = get()
          const history = redoHistory(state.history)
          if (!history) return

          set({
            history,
            ...applyPresent(state, history.present),
          })
        },
      },
    }
  })
}
