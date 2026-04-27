import { arrayMove } from "@dnd-kit/sortable"
import { createStore } from "zustand"
import type { Interval } from "@/lib/workout-utils"
import { clamp, computeMaxPower } from "@/lib/workout-utils"
import { MIN_DURATION, MIN_POWER } from "@/lib/timeline/types"
import { pushHistory, redoHistory, resetHistory, undoHistory } from "./history"
import {
  areIntervalsEqual,
  cleanupState,
  createHistoryEntry,
  createInitialState,
  getDisplayIntervals,
  newWorkoutEditorId,
  reconcileStableIds,
} from "./utils"
import type {
  WorkoutEditorHistoryEntry,
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

export function createWorkoutEditorStore(props: WorkoutEditorStoreProps) {
  return createStore<WorkoutEditorStoreState>()((set, get) => {
    const applyPresent = (
      state: WorkoutEditorStoreState,
      present: WorkoutEditorHistoryEntry
    ) => {
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

    const commitHistoryEntry = (
      nextPresent: WorkoutEditorHistoryEntry,
      options?: { reset?: boolean }
    ) => {
      const state = get()
      const currentPresent = createHistoryEntry(
        state.intervals,
        state.stableIds,
        state.selectedIds,
        state.anchorId
      )
      const history = options?.reset
        ? resetHistory(nextPresent)
        : areHistoryEntriesEqual(currentPresent, nextPresent)
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
      state.onIntervalsChange(history.present.intervals)
    }

    return {
      ...createInitialState(props),
      actions: {
        syncFromProps: (nextProps) => {
          set((state) => {
            const onlyPropsChanged =
              state.powerMode !== nextProps.powerMode ||
              state.ftp !== nextProps.ftp ||
              state.onIntervalsChange !== nextProps.onIntervalsChange

            if (
              areIntervalsEqual(
                state.history.present.intervals,
                nextProps.intervals
              )
            ) {
              if (!onlyPropsChanged) return state

              return {
                powerMode: nextProps.powerMode,
                ftp: nextProps.ftp,
                onIntervalsChange: nextProps.onIntervalsChange,
              }
            }

            const stableIds = reconcileStableIds(
              state.stableIds,
              nextProps.intervals.length
            )
            const present = createHistoryEntry(
              nextProps.intervals,
              stableIds,
              [],
              null
            )
            const history = resetHistory(present)
            const baseState = {
              ...state,
              ...nextProps,
              history,
              stableIds,
              intervals: nextProps.intervals,
              selectedIds: present.selectedIds,
              anchorId: present.anchorId,
              dragPreview: null,
              hoveredIndex: null,
              activeReorderId: null,
            }

            return {
              ...nextProps,
              history,
              historyLimit: state.historyLimit,
              stableIds,
              ...cleanupState(baseState, stableIds, nextProps.intervals),
            }
          })
        },
        syncStableIdsLength: (nextLength) => {
          set((state) => {
            const stableIds = reconcileStableIds(state.stableIds, nextLength)
            const present = createHistoryEntry(
              state.history.present.intervals,
              stableIds,
              state.history.present.selectedIds.filter((id) =>
                stableIds.includes(id)
              ),
              state.history.present.anchorId &&
                stableIds.includes(state.history.present.anchorId)
                ? state.history.present.anchorId
                : null
            )

            return {
              stableIds,
              history: {
                ...state.history,
                present,
              },
              ...cleanupState(state, stableIds, state.intervals),
            }
          })
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
          const stableIds = state.stableIds.filter(
            (_, index) => keepMask[index]
          )
          const intervals = state.intervals.filter(
            (_, index) => keepMask[index]
          )

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
          const defaultPower = state.powerMode === "absolute" ? 150 : 75

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
          const maxPower = computeMaxPower(state.intervals, state.powerMode)
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
          state.onIntervalsChange(history.present.intervals)
        },
        redo: () => {
          const state = get()
          const history = redoHistory(state.history)
          if (!history) return

          set({
            history,
            ...applyPresent(state, history.present),
          })
          state.onIntervalsChange(history.present.intervals)
        },
      },
    }
  })
}
