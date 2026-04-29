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
  useWorkoutEditorStableIds,
} from "./store"
import type { Interval } from "@/lib/workout-utils"

const baseIntervals: Array<Interval> = [
  { startPower: 100, endPower: 100, durationSeconds: 60 },
  { startPower: 150, endPower: 150, durationSeconds: 120 },
  { startPower: 200, endPower: 200, durationSeconds: 180 },
]

function readJson<T>(testId: string): T {
  return JSON.parse(screen.getByTestId(testId).textContent ?? "null") as T
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
  const canUndo = useWorkoutEditorCanUndo()
  const canRedo = useWorkoutEditorCanRedo()
  const isDirty = useWorkoutEditorIsDirty()
  const hasIncomingServerChanges = useWorkoutEditorHasIncomingServerChanges()
  const actions = useWorkoutEditorActions()

  return (
    <div>
      <div data-testid="selected">{JSON.stringify(selectedIds)}</div>
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
      <button onClick={() => actions.nudgeSelectedDuration(5)}>
        nudge-duration
      </button>
      <button onClick={actions.undo}>undo</button>
      <button onClick={actions.redo}>redo</button>
      <button onClick={actions.resetToBaseline}>reset-to-baseline</button>
      <button onClick={actions.adoptPendingServerSnapshot}>adopt-pending</button>
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
    return <div data-testid="editor-intervals">{JSON.stringify(intervals)}</div>
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
    expect(readJson<Array<string>>("selected")).toEqual([stableIds[1], stableIds[0]])

    fireEvent.click(screen.getByText("meta-0"))
    expect(readJson<Array<string>>("selected")).toEqual([stableIds[1]])
  })

  it("makes plain clicks additive in multi-select mode", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("toggle-multi"))
    const stableIds = readJson<Array<string>>("stable")
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("plain-2"))
    expect(readJson<Array<string>>("selected")).toEqual([stableIds[0], stableIds[2]])
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
        readJson<Array<Interval>>("intervals").map((interval) => interval.startPower)
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
        readJson<Array<Interval>>("intervals").map((interval) => interval.startPower)
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
        readJson<Array<Interval>>("intervals").map((interval) => interval.startPower)
      ).toEqual([150, 200, 100])
    })
    expect(readJson<Array<string>>("selected")).toEqual([stableIds[0]])

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(
        readJson<Array<Interval>>("intervals").map((interval) => interval.startPower)
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
        readJson<Array<Interval>>("intervals").map((interval) => interval.startPower)
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
        durationSeconds: before.durationSeconds + 5,
      })
    })

    fireEvent.click(screen.getByText("undo"))
    fireEvent.click(screen.getByText("undo"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")[1]).toEqual(before)
    })
  })

  it("selection-only changes do not create undo history", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("toggle-multi"))

    expect(screen.getByTestId("can-undo").textContent).toBe("no")
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
      expect(readJson<Array<Interval>>("intervals")).toEqual(baseIntervals.slice(0, 1))
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
      expect(readJson<Array<Interval>>("intervals")).toEqual(baseIntervals.slice(0, 2))
      expect(screen.getByTestId("has-incoming").textContent).toBe("yes")
    })

    fireEvent.click(screen.getByText("adopt-pending"))

    await waitFor(() => {
      expect(readJson<Array<Interval>>("intervals")).toEqual(baseIntervals.slice(0, 1))
      expect(screen.getByTestId("has-incoming").textContent).toBe("no")
      expect(screen.getByTestId("is-dirty").textContent).toBe("no")
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
})
