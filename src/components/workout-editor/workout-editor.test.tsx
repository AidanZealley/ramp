import { StrictMode, useRef, useState } from "react"
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WorkoutEditor, type WorkoutEditorHandle } from "./workout-editor"
import {
  WorkoutEditorStoreProvider,
  useWorkoutEditorActions,
  useWorkoutEditorCanRedo,
  useWorkoutEditorCanUndo,
  useWorkoutEditorClipboardIds,
  useWorkoutEditorIntervals,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorStableIds,
} from "./store"
import type { Interval } from "@/lib/workout-utils"

const baseIntervals: Interval[] = [
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
  const intervals = useWorkoutEditorIntervals()
  const selectedIds = useWorkoutEditorSelectedIds()
  const clipboardIds = useWorkoutEditorClipboardIds()
  const stableIds = useWorkoutEditorStableIds()
  const canUndo = useWorkoutEditorCanUndo()
  const canRedo = useWorkoutEditorCanRedo()
  const actions = useWorkoutEditorActions()

  return (
    <div>
      <div data-testid="selected">{JSON.stringify(selectedIds)}</div>
      <div data-testid="clipboard">{JSON.stringify(clipboardIds)}</div>
      <div data-testid="stable">{JSON.stringify(stableIds)}</div>
      <div data-testid="intervals">{JSON.stringify(intervals)}</div>
      <div data-testid="can-undo">{canUndo ? "yes" : "no"}</div>
      <div data-testid="can-redo">{canRedo ? "yes" : "no"}</div>

      <button onClick={() => actions.selectWithModifiers(stableIds[0], { shift: false, meta: false })}>
        plain-0
      </button>
      <button onClick={() => actions.selectWithModifiers(stableIds[1], { shift: false, meta: false })}>
        plain-1
      </button>
      <button onClick={() => actions.selectWithModifiers(stableIds[2], { shift: false, meta: false })}>
        plain-2
      </button>
      <button onClick={() => actions.selectWithModifiers(stableIds[0], { shift: false, meta: true })}>
        meta-0
      </button>
      <button onClick={() => actions.selectWithModifiers(stableIds[1], { shift: false, meta: true })}>
        meta-1
      </button>
      <button onClick={() => actions.selectWithModifiers(stableIds[2], { shift: false, meta: true })}>
        meta-2
      </button>
      <button onClick={() => actions.selectWithModifiers(stableIds[1], { shift: true, meta: false })}>
        shift-1
      </button>
      <button onClick={() => actions.selectWithModifiers(stableIds[2], { shift: true, meta: false })}>
        shift-2
      </button>
      <button onClick={actions.toggleMultiSelect}>toggle-multi</button>
      <button onClick={actions.copySelection}>copy</button>
      <button onClick={() => actions.pasteClipboard()}>paste</button>
      <button onClick={() => actions.pasteClipboard(1)}>paste-1</button>
      <button onClick={actions.deleteSelection}>delete-selection</button>
      <button onClick={() => actions.commitIntervals(baseIntervals.slice(0, 2))}>
        commit-2
      </button>
      <button onClick={() => actions.nudgeSelectedPower(5)}>nudge-power</button>
      <button onClick={() => actions.nudgeSelectedDuration(5)}>nudge-duration</button>
      <button onClick={actions.undo}>undo</button>
      <button onClick={actions.redo}>redo</button>
      <button onClick={actions.reorderIntervals.bind(null, 0, 2, stableIds[0])}>reorder-0-2</button>
    </div>
  )
}

function StoreHarness({
  initialIntervals = baseIntervals,
}: {
  initialIntervals?: Interval[]
}) {
  const [intervals, setIntervals] = useState(initialIntervals)

  return (
    <WorkoutEditorStoreProvider
      intervals={intervals}
      powerMode="absolute"
      ftp={250}
      onIntervalsChange={setIntervals}
    >
      <HarnessContent />
    </WorkoutEditorStoreProvider>
  )
}

function ControlledHarness({
  intervals,
}: {
  intervals: Interval[]
}) {
  return (
    <WorkoutEditorStoreProvider
      intervals={intervals}
      powerMode="absolute"
      ftp={250}
      onIntervalsChange={vi.fn()}
    >
      <HarnessContent />
    </WorkoutEditorStoreProvider>
  )
}

function EditorRefHarness({
  initialIntervals = baseIntervals,
}: {
  initialIntervals?: Interval[]
}) {
  const [intervals, setIntervals] = useState(initialIntervals)
  const editorRef = useRef<WorkoutEditorHandle>(null)

  return (
    <div>
      <button onClick={() => editorRef.current?.insertInterval()}>
        imperative-insert
      </button>
      <input aria-label="notes-input" />
      <div data-testid="editor-intervals">{JSON.stringify(intervals)}</div>
      <WorkoutEditor
        ref={editorRef}
        intervals={intervals}
        powerMode="absolute"
        ftp={250}
        onIntervalsChange={setIntervals}
      />
    </div>
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
    expect(readJson<string[]>("selected")).toHaveLength(1)

    fireEvent.click(screen.getByText("plain-1"))
    expect(readJson<string[]>("selected")).toEqual([])
  })

  it("preserves the original anchor across repeated shift selections", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("shift-2"))
    const fullRange = readJson<string[]>("selected")
    expect(fullRange).toHaveLength(3)

    fireEvent.click(screen.getByText("shift-1"))
    expect(readJson<string[]>("selected")).toEqual(fullRange.slice(0, 2))
  })

  it("toggles membership with meta selection", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    const stableIds = readJson<string[]>("stable")
    fireEvent.click(screen.getByText("meta-0"))
    expect(readJson<string[]>("selected")).toEqual([stableIds[1], stableIds[0]])

    fireEvent.click(screen.getByText("meta-0"))
    expect(readJson<string[]>("selected")).toEqual([stableIds[1]])
  })

  it("makes plain clicks additive in multi-select mode", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("toggle-multi"))
    const stableIds = readJson<string[]>("stable")
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("plain-2"))
    expect(readJson<string[]>("selected")).toEqual([stableIds[0], stableIds[2]])
  })

  it("copies selection in document order instead of click order", () => {
    render(<StoreHarness />)

    const stableIds = readJson<string[]>("stable")
    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("meta-0"))
    fireEvent.click(screen.getByText("copy"))
    expect(readJson<string[]>("clipboard")).toEqual([stableIds[0], stableIds[1]])
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
        readJson<Interval[]>("intervals").map((interval) => interval.startPower)
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
        readJson<Interval[]>("intervals").map((interval) => interval.startPower)
      ).toEqual([100, 200, 150, 200])
    })
  })

  it("deletes multiple selected intervals immediately with no confirmation", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("delete-selection"))

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(1)
    })
    expect(screen.queryByText(/Delete 2 intervals/)).toBeNull()
    expect(screen.getByTestId("can-undo").textContent).toBe("yes")
  })

  it("undoes and redoes insertions", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    const before = readJson<Interval[]>("intervals")

    fireEvent.click(screen.getByText("commit-2"))
    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(2)
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toEqual(before)
    })
    expect(screen.getByTestId("can-redo").textContent).toBe("yes")

    fireEvent.click(screen.getByText("redo"))
    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(2)
    })
  })

  it("undo restores deleted intervals and selection", async () => {
    render(<StoreHarness />)

    const stableIds = readJson<string[]>("stable")
    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("delete-selection"))

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(2)
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(3)
      expect(readJson<string[]>("selected")).toEqual([stableIds[1]])
    })
  })

  it("reorders intervals and undo restores order and selected interval", async () => {
    render(<StoreHarness />)

    const stableIds = readJson<string[]>("stable")
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("reorder-0-2"))

    await waitFor(() => {
      expect(
        readJson<Interval[]>("intervals").map((interval) => interval.startPower)
      ).toEqual([150, 200, 100])
    })
    expect(readJson<string[]>("selected")).toEqual([stableIds[0]])

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(
        readJson<Interval[]>("intervals").map((interval) => interval.startPower)
      ).toEqual([100, 150, 200])
      expect(readJson<string[]>("selected")).toEqual([stableIds[0]])
    })
  })

  it("undo restores pasted intervals and clears redo after a new mutation", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("copy"))
    fireEvent.click(screen.getByText("paste"))

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(4)
    })

    fireEvent.click(screen.getByText("undo"))
    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(3)
    })
    expect(screen.getByTestId("can-redo").textContent).toBe("yes")

    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("nudge-power"))
    expect(screen.getByTestId("can-redo").textContent).toBe("no")
  })

  it("undoes power and duration nudges exactly", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    const before = readJson<Interval[]>("intervals")[1]

    fireEvent.click(screen.getByText("nudge-power"))
    fireEvent.click(screen.getByText("nudge-duration"))

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")[1]).toMatchObject({
        startPower: before.startPower + 5,
        endPower: before.endPower + 5,
        durationSeconds: before.durationSeconds + 5,
      })
    })

    fireEvent.click(screen.getByText("undo"))
    fireEvent.click(screen.getByText("undo"))

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")[1]).toEqual(before)
    })
  })

  it("selection-only changes do not create undo history", () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("toggle-multi"))

    expect(screen.getByTestId("can-undo").textContent).toBe("no")
  })

  it("external prop replacement resets undo and redo history", async () => {
    const { rerender } = render(<ControlledHarness intervals={baseIntervals} />)

    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("commit-2"))
    await waitFor(() => {
      expect(screen.getByTestId("can-undo").textContent).toBe("yes")
    })

    rerender(<ControlledHarness intervals={baseIntervals.slice(0, 1)} />)

    await waitFor(() => {
      expect(screen.getByTestId("can-undo").textContent).toBe("no")
      expect(screen.getByTestId("can-redo").textContent).toBe("no")
    })
  })
})

describe("WorkoutEditor imperative handle and keyboard shortcuts", () => {
  beforeEach(() => {
    setNavigatorPlatform("MacIntel")
  })

  it("inserts after the right-most selected interval", async () => {
    const { container } = render(<EditorRefHarness />)

    const target = container.querySelector('[data-editor-interval-index="1"]')
    expect(target).toBeTruthy()

    fireEvent.click(target!)
    fireEvent.click(screen.getByText("imperative-insert"))

    await waitFor(() => {
      const intervals = readJson<Interval[]>("editor-intervals")
      expect(intervals).toHaveLength(4)
      expect(intervals[2]).toEqual({
        startPower: 150,
        endPower: 200,
        durationSeconds: 300,
      })
    })
  })

  it("does not loop when using the toolbar copy action", async () => {
    const { container } = render(
      <StrictMode>
        <EditorRefHarness />
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
    render(<EditorRefHarness />)

    expect(screen.getByTitle("Undo (Cmd+Z)")).toHaveProperty("disabled", true)
    expect(screen.getByTitle("Redo (Cmd+Shift+Z)")).toHaveProperty(
      "disabled",
      true
    )
  })

  it("supports mac undo and redo keyboard shortcuts", async () => {
    const { container } = render(<EditorRefHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(target!)
    fireEvent.keyDown(document, { key: "Backspace" })

    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(2)
    })

    fireEvent.keyDown(document, { key: "z", metaKey: true })
    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(3)
    })

    fireEvent.keyDown(document, { key: "z", metaKey: true, shiftKey: true })
    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(2)
    })
  })

  it("supports windows undo and redo keyboard shortcuts", async () => {
    setNavigatorPlatform("Win32")
    const { container } = render(<EditorRefHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')

    fireEvent.click(target!)
    fireEvent.keyDown(document, { key: "Backspace" })

    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(2)
    })

    fireEvent.keyDown(document, { key: "z", ctrlKey: true })
    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(3)
    })

    fireEvent.keyDown(document, { key: "z", ctrlKey: true, shiftKey: true })
    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(2)
    })

    fireEvent.keyDown(document, { key: "z", ctrlKey: true })
    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(3)
    })

    fireEvent.keyDown(document, { key: "y", ctrlKey: true })
    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(2)
    })
  })

  it("does not fire keyboard shortcuts while typing in an input", async () => {
    const { container } = render(<EditorRefHarness />)
    const target = container.querySelector('[data-editor-interval-index="1"]')
    const input = screen.getByLabelText("notes-input")

    fireEvent.click(target!)
    input.focus()
    fireEvent.keyDown(input, { key: "Backspace" })
    fireEvent.keyDown(input, { key: "z", metaKey: true })

    await waitFor(() => {
      expect(readJson<Interval[]>("editor-intervals")).toHaveLength(3)
    })
  })
})
