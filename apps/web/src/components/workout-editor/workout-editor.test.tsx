import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WorkoutEditor } from "./workout-editor"
import {
  WorkoutEditorStoreProvider,
  useWorkoutEditorActions,
  useWorkoutEditorCanRedo,
  useWorkoutEditorCanUndo,
  useWorkoutEditorClipboardIds,
  useWorkoutEditorCurrentIntervals,
  useWorkoutEditorHasIncomingServerChanges,
  useWorkoutEditorIsDirty,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorSelectedSection,
  useWorkoutEditorStableIds,
} from "./store"
import { DURATION_SNAP, MIN_DURATION } from "@/lib/timeline/types"
import type { Interval } from "@/lib/workout-utils"

const baseIntervals: Array<Interval> = [
  { startPower: 100, endPower: 100, durationSeconds: 60 },
  { startPower: 150, endPower: 150, durationSeconds: 120 },
  { startPower: 200, endPower: 200, durationSeconds: 180 },
]

function readJson<T>(testId: string): T {
  return JSON.parse(screen.getByTestId(testId).textContent) as T
}

function setNavigatorPlatform(platform: string) {
  Object.defineProperty(window.navigator, "platform", {
    configurable: true,
    value: platform,
  })
  Object.defineProperty(window.navigator, "userAgentData", {
    configurable: true,
    value: undefined,
  })
}

function HarnessContent() {
  const intervals = useWorkoutEditorCurrentIntervals()
  const selectedIds = useWorkoutEditorSelectedIds()
  const clipboardIds = useWorkoutEditorClipboardIds()
  const stableIds = useWorkoutEditorStableIds()
  const selectedSection = useWorkoutEditorSelectedSection()
  const canUndo = useWorkoutEditorCanUndo()
  const canRedo = useWorkoutEditorCanRedo()
  const isDirty = useWorkoutEditorIsDirty()
  const hasIncomingServerChanges = useWorkoutEditorHasIncomingServerChanges()
  const actions = useWorkoutEditorActions()

  return (
    <div>
      <div data-testid="selected">{JSON.stringify(selectedIds)}</div>
      <div data-testid="selected-section">{JSON.stringify(selectedSection)}</div>
      <div data-testid="clipboard">{JSON.stringify(clipboardIds)}</div>
      <div data-testid="stable">{JSON.stringify(stableIds)}</div>
      <div data-testid="intervals">{JSON.stringify(intervals)}</div>
      <div data-testid="can-undo">{canUndo ? "yes" : "no"}</div>
      <div data-testid="can-redo">{canRedo ? "yes" : "no"}</div>
      <div data-testid="is-dirty">{isDirty ? "yes" : "no"}</div>
      <div data-testid="has-incoming">
        {hasIncomingServerChanges ? "yes" : "no"}
      </div>

      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[0], {
            shift: false,
            meta: false,
          })
        }
      >
        plain-0
      </button>
      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[1], {
            shift: false,
            meta: false,
          })
        }
      >
        plain-1
      </button>
      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[2], {
            shift: false,
            meta: false,
          })
        }
      >
        plain-2
      </button>
      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[0], {
            shift: false,
            meta: true,
          })
        }
      >
        meta-0
      </button>
      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[1], {
            shift: false,
            meta: true,
          })
        }
      >
        meta-1
      </button>
      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[2], {
            shift: false,
            meta: true,
          })
        }
      >
        meta-2
      </button>
      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[1], {
            shift: true,
            meta: false,
          })
        }
      >
        shift-1
      </button>
      <button
        onClick={() =>
          actions.selectWithModifiers(stableIds[2], {
            shift: true,
            meta: false,
          })
        }
      >
        shift-2
      </button>
      <button onClick={actions.toggleMultiSelect}>toggle-multi</button>
      <button onClick={actions.clearSelectedSection}>clear-section</button>
      <button onClick={actions.copySelection}>copy</button>
      <button onClick={() => actions.pasteClipboard()}>paste</button>
      <button onClick={() => actions.pasteClipboard(1)}>paste-1</button>
      <button onClick={actions.deleteSelection}>delete-selection</button>
      <button
        onClick={() => actions.commitIntervals(baseIntervals.slice(0, 2))}
      >
        commit-2
      </button>
      <button onClick={actions.insertAfterSelectionOrAppend}>
        insert-relative
      </button>
      <button onClick={() => actions.nudgeSelectedPower(5)}>nudge-power</button>
      <button onClick={() => actions.nudgeSelectedSectionPower(5)}>
        nudge-section-power
      </button>
      <button onClick={() => actions.nudgeSelectedDuration(DURATION_SNAP)}>
        nudge-duration
      </button>
      <button onClick={() => actions.nudgeSelectedDuration(-DURATION_SNAP)}>
        nudge-duration-down
      </button>
      <button
        onClick={() =>
          actions.commitIntervals([
            { startPower: 100, endPower: 100, durationSeconds: 10 },
            { startPower: 150, endPower: 150, durationSeconds: 20 },
          ])
        }
      >
        commit-10s
      </button>
      <button
        onClick={() => actions.setSelectedComment("  Hold\tsteady\nnow  ")}
      >
        set-comment
      </button>
      <button onClick={() => actions.setSelectedComment("   ")}>
        clear-comment
      </button>
      <button onClick={actions.undo}>undo</button>
      <button onClick={actions.redo}>redo</button>
      <button onClick={actions.resetToBaseline}>reset-to-baseline</button>
      <button onClick={actions.adoptPendingServerSnapshot}>
        adopt-pending
      </button>
      <button
        onClick={() => actions.selectSection(stableIds[1], "power-start")}
      >
        select-section-start-1
      </button>
      <button
        onClick={() => actions.selectSection(stableIds[1], "power-uniform")}
      >
        select-section-uniform-1
      </button>
      <button onClick={() => actions.selectSection(stableIds[1], "power-end")}>
        select-section-end-1
      </button>
      <button onClick={actions.reorderIntervals.bind(null, 0, 2, stableIds[0])}>
        reorder-0-2
      </button>
    </div>
  )
}

function StoreHarness({
  initialIntervals = baseIntervals,
  resetKey = "workout-1:0",
  intervalsRevision = 0,
}: {
  initialIntervals?: Array<Interval>
  resetKey?: string
  intervalsRevision?: number
}) {
  return (
    <WorkoutEditorStoreProvider
      serverIntervals={initialIntervals}
      serverResetKey={resetKey}
      serverIntervalsRevision={intervalsRevision}
      displayMode="absolute"
      ftp={250}
    >
      <HarnessContent />
    </WorkoutEditorStoreProvider>
  )
}

function ControlledHarness({
  intervals,
  resetKey,
  intervalsRevision,
}: {
  intervals: Array<Interval>
  resetKey: string
  intervalsRevision: number
}) {
  return (
    <WorkoutEditorStoreProvider
      serverIntervals={intervals}
      serverResetKey={resetKey}
      serverIntervalsRevision={intervalsRevision}
      displayMode="absolute"
      ftp={250}
    >
      <HarnessContent />
    </WorkoutEditorStoreProvider>
  )
}

function EditorActionHarness({
  initialIntervals = baseIntervals,
}: {
  initialIntervals?: Array<Interval>
}) {
  function EditorStateMirror() {
    const intervals = useWorkoutEditorCurrentIntervals()
    const selectedIds = useWorkoutEditorSelectedIds()
    const selectedSection = useWorkoutEditorSelectedSection()
    return (
      <>
        <div data-testid="editor-intervals">{JSON.stringify(intervals)}</div>
        <div data-testid="editor-selected">{JSON.stringify(selectedIds)}</div>
        <div data-testid="editor-selected-section">
          {JSON.stringify(selectedSection)}
        </div>
      </>
    )
  }

  return (
    <WorkoutEditorStoreProvider
      serverIntervals={initialIntervals}
      serverResetKey="workout-1:0"
      serverIntervalsRevision={0}
      displayMode="absolute"
      ftp={250}
    >
      <div>
        <input aria-label="notes-input" />
        <EditorStateMirror />
        <WorkoutEditor />
      </div>
    </WorkoutEditorStoreProvider>
  )
}

function getInlineInsertButtons() {
  return screen.queryAllByTitle("Insert interval")
}

function getIntervalBody(container: HTMLElement, index: number) {
  return container.querySelector(`[data-editor-interval-body-index="${index}"]`)
}

function getSectionTarget(
  container: HTMLElement,
  index: number,
  target: "power-start" | "power-uniform" | "power-end"
) {
  return container.querySelector(
    `[data-editor-interval-index="${index}"][data-editor-section-target="${target}"]`
  )
}

describe("workout editor store", () => {
  beforeEach(() => {
    setNavigatorPlatform("MacIntel")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("toggles a single plain-click selection on and off", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    expect(readJson<Array<string>>("selected")).toHaveLength(1)

    fireEvent.click(screen.getByText("plain-1"))
    expect(readJson<Array<string>>("selected")).toEqual([])
  })

  it("preserves the original anchor across repeated shift selections", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("shift-2"))
    const fullRange = readJson<Array<string>>("selected")
    expect(fullRange).toHaveLength(3)

    fireEvent.click(screen.getByText("shift-1"))
    expect(readJson<Array<string>>("selected")).toEqual(fullRange.slice(0, 2))
  })

  it("toggles membership with meta selection", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    const stableIds = readJson<Array<string>>("stable")
    fireEvent.click(screen.getByText("meta-0"))
    expect(readJson<Array<string>>("selected")).toEqual([
      stableIds[1],
      stableIds[0],
    ])

    fireEvent.click(screen.getByText("meta-0"))
    expect(readJson<Array<string>>("selected")).toEqual([stableIds[1]])
  })

  it("makes plain clicks additive in multi-select mode", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("toggle-multi"))
    const stableIds = readJson<Array<string>>("stable")
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("plain-2"))
    expect(readJson<Array<string>>("selected")).toEqual([
      stableIds[0],
      stableIds[2],
    ])
  })

  it("copies selection in document order instead of click order", () => {
    render(<StoreHarness />)

    const stableIds = readJson<Array<string>>("stable")
    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("meta-0"))
    fireEvent.click(screen.getByText("copy"))
    expect(readJson<Array<string>>("clipboard")).toEqual([
      stableIds[0],
      stableIds[1],
    ])
  })

  it("pastes after the right-most selected interval by default", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("copy"))
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("paste"))

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("intervals").map(
          (interval) => interval.startPower
        )
      ).toEqual([100, 100, 150, 150, 200])
    })
    expect(screen.getByTestId("can-undo").textContent).toBe("yes")
  })

  it("pastes at an explicit insert index", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-2"))
    fireEvent.click(screen.getByText("copy"))
    fireEvent.click(screen.getByText("paste-1"))

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("intervals").map(
          (interval) => interval.startPower
        )
      ).toEqual([100, 200, 150, 200])
    })
  })

  it("deletes multiple selected intervals immediately with no confirmation", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("delete-selection"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(1)
    })
    expect(screen.queryByText(/Delete 2 intervals/)).toBeNull()
    expect(screen.getByTestId("can-undo").textContent).toBe("yes")
  })

  it("undoes and redoes insertions", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    const before = readJson<Array<Interval>>("intervals")

    fireEvent.click(screen.getByText("commit-2"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(2)
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual(before)
    })
    expect(screen.getByTestId("can-redo").textContent).toBe("yes")

    fireEvent.click(screen.getByText("redo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(2)
    })
  })

  it("undo restores deleted intervals and selection", async () => {
    render(<StoreHarness />)

    const stableIds = readJson<Array<string>>("stable")
    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("delete-selection"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(2)
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(3)
      expect(readJson<Array<string>>("selected")).toEqual([stableIds[1]])
    })
  })

  it("reorders intervals and undo restores order and selected interval", async () => {
    render(<StoreHarness />)

    const stableIds = readJson<Array<string>>("stable")
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("reorder-0-2"))

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("intervals").map(
          (interval) => interval.startPower
        )
      ).toEqual([150, 200, 100])
    })
    expect(readJson<Array<string>>("selected")).toEqual([stableIds[0]])

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("intervals").map(
          (interval) => interval.startPower
        )
      ).toEqual([100, 150, 200])
      expect(readJson<Array<string>>("selected")).toEqual([stableIds[0]])
    })
  })

  it("undo restores pasted intervals and clears redo after a new mutation", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("copy"))
    fireEvent.click(screen.getByText("paste"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(4)
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(3)
    })
    expect(screen.getByTestId("can-redo").textContent).toBe("yes")

    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("nudge-power"))
    expect(screen.getByTestId("can-redo").textContent).toBe("no")
  })

  it("appends when insertAfterSelectionOrAppend runs without a selection", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("insert-relative"))

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("intervals").map(
          (interval) => interval.startPower
        )
      ).toEqual([100, 150, 200, 200])
    })
  })

  it("inserts after the right-most selected interval through the store action", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("insert-relative"))

    await waitFor(() => {
      const intervals = readJson<Array<Interval>>("intervals")
      expect(intervals).toHaveLength(4)
      expect(intervals[2]).toEqual({
        startPower: 150,
        endPower: 200,
        durationSeconds: 300,
      })
    })
  })

  it("supports undo and redo after insertion through the new store action", async () => {
    render(<StoreHarness />)

    const before = readJson<Array<Interval>>("intervals")
    fireEvent.click(screen.getByText("insert-relative"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(4)
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual(before)
    })

    fireEvent.click(screen.getByText("redo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(4)
    })
  })

  it("undoes power and duration nudges exactly", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    const before = readJson<Array<Interval>>("intervals")[1]

    fireEvent.click(screen.getByText("nudge-power"))
    fireEvent.click(screen.getByText("nudge-duration"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[1]).toMatchObject({
        startPower: before.startPower + 5,
        endPower: before.endPower + 5,
        durationSeconds: before.durationSeconds + DURATION_SNAP,
      })
    })

    fireEvent.click(screen.getByText("undo"))
    fireEvent.click(screen.getByText("undo"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[1]).toEqual(before)
    })
  })

  it("clamps duration nudges at the 10-second minimum", async () => {
    render(
      <StoreHarness
        initialIntervals={[
          { startPower: 100, endPower: 100, durationSeconds: 20 },
          { startPower: 150, endPower: 150, durationSeconds: 40 },
        ]}
      />
    )

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("nudge-duration-down"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[0].durationSeconds).toBe(10)
    })

    fireEvent.click(screen.getByText("nudge-duration-down"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[0].durationSeconds).toBe(
        MIN_DURATION
      )
    })
  })

  it("preserves 10-second interval values through commitIntervals", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("commit-10s"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual([
        { startPower: 100, endPower: 100, durationSeconds: 10 },
        { startPower: 150, endPower: 150, durationSeconds: 20 },
      ])
    })
  })

  it("selection-only changes do not create undo history", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("toggle-multi"))

    expect(screen.getByTestId("can-undo").textContent).toBe("no")
  })

  it("clears the selected subsection when selection changes away from its interval", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("select-section-start-1"))
    expect(readJson("selected-section")).toMatchObject({
      target: "power-start",
    })

    fireEvent.click(screen.getByText("plain-0"))
    expect(readJson("selected-section")).toBeNull()
  })

  it("clears the selected subsection when selection becomes multi-select", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("select-section-start-1"))
    fireEvent.click(screen.getByText("meta-0"))

    expect(readJson("selected")).toHaveLength(2)
    expect(readJson("selected-section")).toBeNull()
  })

  it("clears subsection state when the selected interval is deleted", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("select-section-start-1"))
    fireEvent.click(screen.getByText("delete-selection"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toHaveLength(2)
      expect(readJson("selected-section")).toBeNull()
    })
  })

  it("applies and clears comments on all selected intervals", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-2"))
    fireEvent.click(screen.getByText("set-comment"))

    await waitFor(() => {
      const intervals = readJson<Array<Interval>>("intervals")
      expect(intervals[0].comment).toBe("Hold steady now")
      expect(intervals[1].comment).toBeUndefined()
      expect(intervals[2].comment).toBe("Hold steady now")
    })

    fireEvent.click(screen.getByText("clear-comment"))

    await waitFor(() => {
      const intervals = readJson<Array<Interval>>("intervals")
      expect(intervals[0].comment).toBeUndefined()
      expect(intervals[2].comment).toBeUndefined()
    })
  })

  it("comment edits create undo and redo history", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("set-comment"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[1].comment).toBe(
        "Hold steady now"
      )
      expect(screen.getByTestId("can-undo").textContent).toBe("yes")
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[1].comment).toBeUndefined()
      expect(screen.getByTestId("can-redo").textContent).toBe("yes")
    })

    fireEvent.click(screen.getByText("redo"))
    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[1].comment).toBe(
        "Hold steady now"
      )
    })
  })

  it("resetToBaseline clears dirty state and resets history", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("commit-2"))
    await waitFor(() => {
      expect(screen.getByTestId("is-dirty").textContent).toBe("yes")
      expect(screen.getByTestId("can-undo").textContent).toBe("yes")
    })

    fireEvent.click(screen.getByText("reset-to-baseline"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual(baseIntervals)
      expect(screen.getByTestId("is-dirty").textContent).toBe("no")
      expect(screen.getByTestId("can-undo").textContent).toBe("no")
      expect(screen.getByTestId("can-redo").textContent).toBe("no")
    })
  })

  it("a clean editor auto-adopts a new server snapshot", async () => {
    const { rerender } = render(
      <ControlledHarness
        intervals={baseIntervals}
        resetKey="workout-1:0"
        intervalsRevision={0}
      />
    )

    rerender(
      <ControlledHarness
        intervals={baseIntervals.slice(0, 1)}
        resetKey="workout-1:1"
        intervalsRevision={1}
      />
    )

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual(
        baseIntervals.slice(0, 1)
      )
      expect(screen.getByTestId("is-dirty").textContent).toBe("no")
      expect(screen.getByTestId("can-undo").textContent).toBe("no")
    })
  })

  it("a dirty editor keeps local edits and stores an incoming snapshot", async () => {
    const { rerender } = render(
      <ControlledHarness
        intervals={baseIntervals}
        resetKey="workout-1:0"
        intervalsRevision={0}
      />
    )

    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("commit-2"))
    await waitFor(() => {
      expect(screen.getByTestId("is-dirty").textContent).toBe("yes")
    })

    rerender(
      <ControlledHarness
        intervals={baseIntervals.slice(0, 1)}
        resetKey="workout-1:1"
        intervalsRevision={1}
      />
    )

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual(
        baseIntervals.slice(0, 2)
      )
      expect(screen.getByTestId("has-incoming").textContent).toBe("yes")
    })

    fireEvent.click(screen.getByText("adopt-pending"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual(
        baseIntervals.slice(0, 1)
      )
      expect(screen.getByTestId("has-incoming").textContent).toBe("no")
      expect(screen.getByTestId("is-dirty").textContent).toBe("no")
    })
  })
})

describe("WorkoutEditor inline insert zones", () => {
  it("renders no inline insert buttons when nothing is selected", () => {
    render(<EditorActionHarness />)

    expect(getInlineInsertButtons()).toHaveLength(0)
  })

  it("renders both adjacent inline insert buttons for a selected middle interval", () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(target!)

    expect(getInlineInsertButtons()).toHaveLength(2)
  })

  it("renders only the trailing inline insert button for a selected first interval", () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="0"]')

    fireEvent.click(target!)

    expect(getInlineInsertButtons()).toHaveLength(1)
  })

  it("renders only the leading inline insert button for a selected last interval", () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="2"]')

    fireEvent.click(target!)

    expect(getInlineInsertButtons()).toHaveLength(1)
  })

  it("renders the boundaries adjacent to a contiguous multi-selection", () => {
    const { container } = render(<EditorActionHarness />)
    const first = container.querySelector('[data-editor-interval-index="0"]')
    const second = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(first!)
    fireEvent.click(second!, { metaKey: true })

    expect(getInlineInsertButtons()).toHaveLength(2)
  })

  it("clears inline insert buttons when selection is cleared", async () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(target!)
    expect(getInlineInsertButtons()).toHaveLength(2)

    fireEvent.click(screen.getByLabelText("notes-input"))

    await waitFor(() => {
      expect(getInlineInsertButtons()).toHaveLength(0)
    })
  })

  it("keeps inline insert actions targeting the same boundary index", async () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="0"]')

    fireEvent.click(target!)
    fireEvent.click(screen.getByTitle("Insert interval"))

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("editor-intervals").map(
          (interval) => interval.startPower
        )
      ).toEqual([100, 100, 150, 200])
    })
  })
})

describe("WorkoutEditor keyboard shortcuts", () => {
  beforeEach(() => {
    setNavigatorPlatform("MacIntel")
  })

  it("does not loop when using the toolbar copy action", async () => {
    const { container } = render(
      <StrictMode>
        <EditorActionHarness />
      </StrictMode>
    )

    const target = container.querySelector('[data-editor-interval-index="1"]')
    expect(target).toBeTruthy()

    fireEvent.click(target!)
    fireEvent.click(screen.getByTitle("Copy (Cmd/Ctrl+C)"))

    await waitFor(() => {
      expect(screen.getByTitle(/Clipboard: 1 interval/)).toBeTruthy()
    })
  })

  it("shows undo and redo toolbar buttons with mac titles", () => {
    render(<EditorActionHarness />)

    expect(screen.getByTitle("Undo (Cmd+Z)")).toHaveProperty("disabled", true)
    expect(screen.getByTitle("Redo (Cmd+Shift+Z)")).toHaveProperty(
      "disabled",
      true
    )
  })

  it("shows the comment toolbar button when intervals are selected", () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    expect(screen.queryByTitle("Add comment")).toBeNull()
    fireEvent.click(target!)

    expect(screen.getByTitle("Add comment")).toBeTruthy()
  })

  it("applies and clears comments through the toolbar dialog", async () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(target!)
    fireEvent.click(screen.getByTitle("Add comment"))
    fireEvent.change(screen.getAllByRole("textbox").at(-1)!, {
      target: { value: "Attack now" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Apply" }))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")[1].comment).toBe(
        "Attack now"
      )
    })

    fireEvent.click(screen.getByTitle("Add comment"))
    fireEvent.change(screen.getAllByRole("textbox").at(-1)!, {
      target: { value: "" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Clear comments" }))

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("editor-intervals")[1].comment
      ).toBeUndefined()
    })
  })

  it("renders interval comments as a bottom-anchored icon, never inline text", () => {
    const { container } = render(
      <EditorActionHarness
        initialIntervals={[
          {
            startPower: 100,
            endPower: 100,
            durationSeconds: 300,
            comment: "Long visible comment",
          },
          {
            startPower: 100,
            endPower: 100,
            durationSeconds: 20,
            comment: "Narrow comment",
          },
        ]}
      />
    )

    // Chart no longer renders comment text inline — even on wide intervals.
    // The full text is surfaced through the selection details panel; the
    // chart uses a single bottom-anchored icon as the visual signal.
    expect(screen.queryByText("Long visible comment")).toBeNull()
    expect(
      container.querySelectorAll('[aria-label="Interval comment"]').length
    ).toBeGreaterThan(0)
  })

  it("supports mac undo and redo keyboard shortcuts", async () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(target!)
    fireEvent.keyDown(document, { key: "Backspace" })

    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(2)
    })

    fireEvent.keyDown(document, { key: "z", metaKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(3)
    })

    fireEvent.keyDown(document, { key: "z", metaKey: true, shiftKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(2)
    })
  })

  it("supports windows undo and redo keyboard shortcuts", async () => {
    setNavigatorPlatform("Win32")
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(target!)
    fireEvent.keyDown(document, { key: "Backspace" })

    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(2)
    })

    fireEvent.keyDown(document, { key: "z", ctrlKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(3)
    })

    fireEvent.keyDown(document, { key: "z", ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(2)
    })

    fireEvent.keyDown(document, { key: "z", ctrlKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(3)
    })

    fireEvent.keyDown(document, { key: "y", ctrlKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(2)
    })
  })

  it("does not fire keyboard shortcuts while typing in an input", async () => {
    const { container } = render(<EditorActionHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')
    const input = screen.getByLabelText("notes-input")

    fireEvent.click(target!)
    input.focus()
    fireEvent.keyDown(input, { key: "Backspace" })
    fireEvent.keyDown(input, { key: "z", metaKey: true })

    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toHaveLength(3)
    })
  })

  it("clicking the interval body keeps the interval selected and clears subsection selection", async () => {
    const { container } = render(<EditorActionHarness />)
    const body = getIntervalBody(container, 1)

    fireEvent.click(body!)
    fireEvent.click(getSectionTarget(container, 1, "power-start")!)

    await waitFor(() => {
      expect(readJson("editor-selected-section")).toMatchObject({
        target: "power-start",
      })
    })

    fireEvent.click(body!)

    await waitFor(() => {
      expect(readJson("editor-selected")).toHaveLength(1)
      expect(readJson("editor-selected-section")).toBeNull()
    })
  })

  it("clicking ramp subsection targets selects start, uniform, and end sections", async () => {
    const { container } = render(
      <EditorActionHarness
        initialIntervals={[
          { startPower: 100, endPower: 160, durationSeconds: 60 },
          { startPower: 120, endPower: 180, durationSeconds: 120 },
        ]}
      />
    )

    fireEvent.click(getIntervalBody(container, 1)!)
    fireEvent.click(getSectionTarget(container, 1, "power-start")!)
    await waitFor(() => {
      expect(readJson("editor-selected-section")).toMatchObject({
        target: "power-start",
      })
    })

    fireEvent.click(getSectionTarget(container, 1, "power-uniform")!)
    await waitFor(() => {
      expect(readJson("editor-selected-section")).toMatchObject({
        target: "power-uniform",
      })
    })

    fireEvent.click(getSectionTarget(container, 1, "power-end")!)
    await waitFor(() => {
      expect(readJson("editor-selected-section")).toMatchObject({
        target: "power-end",
      })
    })
  })

  it("uses subsection keyboard nudges for start, uniform, and end targets", async () => {
    const { container } = render(
      <EditorActionHarness
        initialIntervals={[
          { startPower: 100, endPower: 150, durationSeconds: 60 },
          { startPower: 120, endPower: 180, durationSeconds: 120 },
        ]}
      />
    )

    fireEvent.click(getIntervalBody(container, 1)!)
    fireEvent.click(getSectionTarget(container, 1, "power-start")!)
    fireEvent.keyDown(document, { key: "ArrowUp" })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")[1]).toMatchObject({
        startPower: 121,
        endPower: 180,
      })
    })

    fireEvent.click(getSectionTarget(container, 1, "power-end")!)
    fireEvent.keyDown(document, { key: "ArrowDown" })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")[1]).toMatchObject({
        startPower: 121,
        endPower: 179,
      })
    })

    fireEvent.click(getSectionTarget(container, 1, "power-uniform")!)
    fireEvent.keyDown(document, { key: "ArrowUp" })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")[1]).toMatchObject({
        startPower: 122,
        endPower: 180,
      })
    })
  })

  it("keeps whole-interval power nudges for multi-select", async () => {
    const { container } = render(
      <EditorActionHarness
        initialIntervals={[
          { startPower: 100, endPower: 140, durationSeconds: 60 },
          { startPower: 120, endPower: 180, durationSeconds: 120 },
        ]}
      />
    )

    fireEvent.click(getIntervalBody(container, 0)!)
    fireEvent.click(getIntervalBody(container, 1)!, { metaKey: true })
    fireEvent.keyDown(document, { key: "ArrowUp" })

    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")).toEqual([
        { startPower: 101, endPower: 141, durationSeconds: 60 },
        { startPower: 121, endPower: 181, durationSeconds: 120 },
      ])
      expect(readJson("editor-selected-section")).toBeNull()
    })
  })

  it("keeps duration nudges active while a subsection is selected", async () => {
    const { container } = render(
      <EditorActionHarness
        initialIntervals={[
          { startPower: 100, endPower: 150, durationSeconds: 60 },
          { startPower: 120, endPower: 180, durationSeconds: 120 },
        ]}
      />
    )

    fireEvent.click(getIntervalBody(container, 1)!)
    fireEvent.click(getSectionTarget(container, 1, "power-start")!)
    fireEvent.keyDown(document, { key: "ArrowRight" })

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("editor-intervals")[1].durationSeconds
      ).toBe(130)
    })
  })

  it("clears subsection selection on the first Escape and interval selection on the second", async () => {
    const { container } = render(<EditorActionHarness />)

    fireEvent.click(getIntervalBody(container, 1)!)
    fireEvent.click(getSectionTarget(container, 1, "power-start")!)

    await waitFor(() => {
      expect(readJson("editor-selected-section")).toMatchObject({
        target: "power-start",
      })
    })

    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => {
      expect(readJson("editor-selected-section")).toBeNull()
      expect(readJson("editor-selected")).toHaveLength(1)
    })

    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => {
      expect(readJson("editor-selected")).toEqual([])
    })
  })

  it("does not restore subsection ui state across undo and redo", async () => {
    const { container } = render(
      <EditorActionHarness
        initialIntervals={[
          { startPower: 100, endPower: 150, durationSeconds: 60 },
          { startPower: 120, endPower: 180, durationSeconds: 120 },
        ]}
      />
    )

    fireEvent.click(getIntervalBody(container, 1)!)
    fireEvent.click(getSectionTarget(container, 1, "power-start")!)
    fireEvent.keyDown(document, { key: "ArrowUp" })

    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")[1].startPower).toBe(
        121
      )
    })

    fireEvent.keyDown(document, { key: "Escape" })
    await waitFor(() => {
      expect(readJson("editor-selected-section")).toBeNull()
    })

    fireEvent.keyDown(document, { key: "z", metaKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")[1].startPower).toBe(
        120
      )
      expect(readJson("editor-selected-section")).toBeNull()
    })

    fireEvent.keyDown(document, { key: "z", metaKey: true, shiftKey: true })
    await waitFor(() => {
      expect(readJson<Array<Interval>>("editor-intervals")[1].startPower).toBe(
        121
      )
      expect(readJson("editor-selected-section")).toBeNull()
    })
  })

  it("uses 10-second keyboard duration nudges and clamps at the new minimum", async () => {
    const { container } = render(
      <EditorActionHarness
        initialIntervals={[
          { startPower: 100, endPower: 100, durationSeconds: 20 },
          { startPower: 150, endPower: 150, durationSeconds: 30 },
        ]}
      />
    )
    const target = container.querySelector('[data-editor-interval-index="0"]')

    fireEvent.click(target!)
    fireEvent.keyDown(document, { key: "ArrowRight" })

    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("editor-intervals")[0].durationSeconds
      ).toBe(30)
    })

    fireEvent.keyDown(document, { key: "ArrowLeft" })
    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("editor-intervals")[0].durationSeconds
      ).toBe(20)
    })

    fireEvent.keyDown(document, { key: "ArrowLeft" })
    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("editor-intervals")[0].durationSeconds
      ).toBe(10)
    })

    fireEvent.keyDown(document, { key: "ArrowLeft" })
    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("editor-intervals")[0].durationSeconds
      ).toBe(MIN_DURATION)
    })
  })
})
