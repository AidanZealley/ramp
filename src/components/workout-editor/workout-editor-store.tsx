import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react"
import { arrayMove } from "@dnd-kit/sortable"
import { createStore, useStore } from "zustand"
import type { Interval } from "@/lib/workout-utils"
import { clamp, computeMaxPower } from "@/lib/workout-utils"
import { MIN_DURATION, MIN_POWER } from "@/lib/timeline/types"
import type { SelectModifiers } from "./interval-block"

let idCounter = 0

const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `workout-editor-${++idCounter}`

interface WorkoutEditorStoreProps {
  intervals: Interval[]
  powerMode: "absolute" | "percentage"
  ftp: number
  onIntervalsChange: (intervals: Interval[]) => void
}

interface ClipboardPreviewData {
  intervals: Interval[]
  gapBefore: boolean[]
}

interface WorkoutEditorStoreState extends WorkoutEditorStoreProps {
  dragPreview: Interval[] | null
  hoveredIndex: number | null
  selectedIds: string[]
  anchorId: string | null
  multiSelectMode: boolean
  clipboardIds: string[]
  showDeleteConfirm: boolean
  activeReorderId: string | null
  stableIds: string[]
  actions: {
    syncFromProps: (props: WorkoutEditorStoreProps) => void
    syncStableIdsLength: (nextLength: number) => void
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
    requestDelete: () => void
    confirmDelete: () => void
    cancelDelete: () => void
    deleteIntervals: (ids: string[]) => void
    insertAt: (index: number) => void
    reorderIntervals: (oldIndex: number, newIndex: number, activeId: string) => void
    nudgeSelectedPower: (delta: number) => void
    nudgeSelectedDuration: (delta: number) => void
  }
}

const WorkoutEditorStoreContext = createContext<
  ReturnType<typeof createWorkoutEditorStore> | null
>(null)

function getDisplayIntervals(state: WorkoutEditorStoreState) {
  return state.dragPreview ?? state.intervals
}

function normalizeStableIds(stableIds: string[], nextLength: number): string[] {
  const trimmed = stableIds.slice(0, nextLength)
  const seen = new Set<string>()
  const normalized = trimmed.map((id) => {
    if (!id || seen.has(id)) {
      const replacement = newId()
      seen.add(replacement)
      return replacement
    }
    seen.add(id)
    return id
  })

  if (normalized.length < nextLength) {
    normalized.push(
      ...Array.from({ length: nextLength - normalized.length }, () => newId())
    )
  }

  return normalized
}

function reconcileStableIds(
  stableIds: string[],
  nextLength: number
): string[] {
  return normalizeStableIds(stableIds, nextLength)
}

function cleanupState(
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

function createInitialState(
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
    stableIds: props.intervals.map(() => newId()),
  }
}

function createWorkoutEditorStore(props: WorkoutEditorStoreProps) {
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

        const newIds = toPaste.map(() => newId())
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

        const freshId = newId()
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

function useWorkoutEditorStore<T>(selector: (state: WorkoutEditorStoreState) => T) {
  const store = useContext(WorkoutEditorStoreContext)
  if (!store) {
    throw new Error("WorkoutEditorStoreProvider is missing from the tree")
  }
  return useStore(store, selector)
}

export function WorkoutEditorStoreProvider({
  children,
  ...props
}: PropsWithChildren<WorkoutEditorStoreProps>) {
  const storeRef = useRef<ReturnType<typeof createWorkoutEditorStore> | null>(
    null
  )

  if (!storeRef.current) {
    storeRef.current = createWorkoutEditorStore(props)
  }

  useEffect(() => {
    storeRef.current?.getState().actions.syncFromProps(props)
  }, [props.intervals, props.powerMode, props.ftp, props.onIntervalsChange])

  return (
    <WorkoutEditorStoreContext.Provider value={storeRef.current}>
      {children}
    </WorkoutEditorStoreContext.Provider>
  )
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

export const useWorkoutEditorActions = () =>
  useWorkoutEditorStore((state) => state.actions)

export const useWorkoutEditorClipboardPreview = (): ClipboardPreviewData | null => {
  const clipboardIds = useWorkoutEditorClipboardIds()
  const stableIds = useWorkoutEditorStableIds()
  const displayIntervals = useWorkoutEditorDisplayIntervals()

  return useMemo(() => {
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
  }, [clipboardIds, stableIds, displayIntervals])
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
