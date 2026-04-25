import { arrayMove } from "@dnd-kit/sortable"
import { createStore } from "zustand"
import type { Interval } from "@/lib/workout-utils"
import { clamp, computeMaxPower } from "@/lib/workout-utils"
import { MIN_DURATION, MIN_POWER } from "@/lib/timeline/types"
import {
  cleanupState,
  createInitialState,
  getDisplayIntervals,
  newWorkoutEditorId,
  reconcileStableIds,
} from "./utils"
import type {
  WorkoutEditorStoreProps,
  WorkoutEditorStoreState,
} from "./types"

export function createWorkoutEditorStore(props: WorkoutEditorStoreProps) {
  return createStore<WorkoutEditorStoreState>()((set, get) => ({
    ...createInitialState(props),
    actions: {
      syncFromProps: (nextProps) => {
        set((state) => {
          if (
            state.intervals === nextProps.intervals &&
            state.powerMode === nextProps.powerMode &&
            state.ftp === nextProps.ftp &&
            state.onIntervalsChange === nextProps.onIntervalsChange
          ) {
            return state
          }

          const stableIds = reconcileStableIds(
            state.stableIds,
            nextProps.intervals.length
          )
          return {
            ...nextProps,
            stableIds,
            ...cleanupState(state, stableIds, nextProps.intervals),
          }
        })
      },
      syncStableIdsLength: (nextLength) => {
        set((state) => {
          const stableIds = reconcileStableIds(state.stableIds, nextLength)
          return {
            stableIds,
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
          showDeleteConfirm: false,
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
            clipboardIds: state.stableIds.filter((id) => selectedIdSet.has(id)),
          }
        })
      },
      cutSelection: () => {
        const { actions, selectedIds } = get()
        if (selectedIds.length === 0) return
        actions.copySelection()
        actions.requestDelete()
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

        set({
          stableIds: nextStableIds,
          selectedIds: newIds,
          anchorId: newIds[newIds.length - 1] ?? null,
        })
        state.onIntervalsChange(nextIntervals)
      },
      requestDelete: () => {
        const { selectedIds, actions } = get()
        if (selectedIds.length === 0) return
        if (selectedIds.length > 1) {
          set({ showDeleteConfirm: true })
          return
        }
        actions.deleteIntervals(selectedIds)
      },
      confirmDelete: () => {
        const { selectedIds, actions } = get()
        actions.deleteIntervals(selectedIds)
      },
      cancelDelete: () => {
        set({ showDeleteConfirm: false })
      },
      deleteIntervals: (ids) => {
        if (ids.length === 0) return
        const state = get()
        const toDelete = new Set(ids)
        const keepMask = state.stableIds.map((id) => !toDelete.has(id))
        const stableIds = state.stableIds.filter((_, index) => keepMask[index])
        const intervals = state.intervals.filter((_, index) => keepMask[index])

        set({
          stableIds,
          selectedIds: [],
          anchorId: null,
          showDeleteConfirm: false,
          hoveredIndex: null,
          activeReorderId: null,
        })
        state.onIntervalsChange(intervals)
      },
      insertAt: (index) => {
        const state = get()
        const displayIntervals = getDisplayIntervals(state)
        const prev = displayIntervals[index - 1]
        const next = displayIntervals[index]
        const defaultPower = state.powerMode === "absolute" ? 150 : 75

        const newInterval: Interval = {
          startPower: prev ? prev.endPower : (next?.startPower ?? defaultPower),
          endPower: next ? next.startPower : (prev?.endPower ?? defaultPower),
          durationSeconds: 300,
        }

        const freshId = newWorkoutEditorId()
        const nextStableIds = [...state.stableIds]
        const nextIntervals = [...state.intervals]
        nextStableIds.splice(index, 0, freshId)
        nextIntervals.splice(index, 0, newInterval)

        set({
          stableIds: nextStableIds,
          selectedIds: [freshId],
          anchorId: freshId,
        })
        state.onIntervalsChange(nextIntervals)
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

        set({
          stableIds: arrayMove([...state.stableIds], oldIndex, newIndex),
          selectedIds: [activeId],
          anchorId: activeId,
          activeReorderId: null,
        })
        state.onIntervalsChange(
          arrayMove([...state.intervals], oldIndex, newIndex)
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
            startPower: clamp(interval.startPower + delta, MIN_POWER, maxPower),
            endPower: clamp(interval.endPower + delta, MIN_POWER, maxPower),
          }
        }
        state.onIntervalsChange(updated)
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
        state.onIntervalsChange(updated)
      },
    },
  }))
}
