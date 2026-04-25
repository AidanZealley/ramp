import { StrictMode, useRef, useState } from "react"
import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { WorkoutEditor, type WorkoutEditorHandle } from "./workout-editor"
import {
  WorkoutEditorStoreProvider,
  useWorkoutEditorActions,
  useWorkoutEditorClipboardIds,
  useWorkoutEditorIntervals,
  useWorkoutEditorSelectedIds,
  useWorkoutEditorShowDeleteConfirm,
  useWorkoutEditorStableIds,
} from "./workout-editor-store"
import type { Interval } from "@/lib/workout-utils"

const baseIntervals: Interval[] = [
  { startPower: 100, endPower: 100, durationSeconds: 60 },
  { startPower: 150, endPower: 150, durationSeconds: 120 },
  { startPower: 200, endPower: 200, durationSeconds: 180 },
]

function readJson<T>(testId: string): T {
  return JSON.parse(screen.getByTestId(testId).textContent ?? "null") as T
}

function HarnessContent() {
  const intervals = useWorkoutEditorIntervals()
  const selectedIds = useWorkoutEditorSelectedIds()
  const clipboardIds = useWorkoutEditorClipboardIds()
  const stableIds = useWorkoutEditorStableIds()
  const showDeleteConfirm = useWorkoutEditorShowDeleteConfirm()
  const actions = useWorkoutEditorActions()

  return (
    <div>
      <div data-testid="selected">{JSON.stringify(selectedIds)}</div>
      <div data-testid="clipboard">{JSON.stringify(clipboardIds)}</div>
      <div data-testid="stable">{JSON.stringify(stableIds)}</div>
      <div data-testid="intervals">{JSON.stringify(intervals)}</div>
      <div data-testid="delete-confirm">{showDeleteConfirm ? "open" : "closed"}</div>

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
      <button onClick={actions.requestDelete}>request-delete</button>
      <button onClick={actions.confirmDelete}>confirm-delete</button>
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
      expect(readJson<Interval[]>("intervals").map((interval) => interval.startPower)).toEqual([
        100,
        100,
        150,
        150,
        200,
      ])
    })
  })

  it("pastes at an explicit insert index", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-2"))
    fireEvent.click(screen.getByText("copy"))
    fireEvent.click(screen.getByText("paste-1"))

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals").map((interval) => interval.startPower)).toEqual([
        100,
        200,
        150,
        200,
      ])
    })
  })

  it("deletes a single selected interval immediately", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-1"))
    fireEvent.click(screen.getByText("request-delete"))
    expect(screen.getByTestId("delete-confirm").textContent).toBe("closed")

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(2)
    })
  })

  it("requires confirmation for multi-delete", async () => {
    render(<StoreHarness />)

    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("request-delete"))
    expect(screen.getByTestId("delete-confirm").textContent).toBe("open")

    fireEvent.click(screen.getByText("confirm-delete"))
    await waitFor(() => {
      expect(readJson<Interval[]>("intervals")).toHaveLength(1)
    })
  })

  it("reorders intervals and collapses selection to the dragged interval", async () => {
    render(<StoreHarness />)

    const stableIds = readJson<string[]>("stable")
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("reorder-0-2"))

    await waitFor(() => {
      expect(readJson<Interval[]>("intervals").map((interval) => interval.startPower)).toEqual([
        150,
        200,
        100,
      ])
    })
    expect(readJson<string[]>("selected")).toEqual([stableIds[0]])
    expect(readJson<string[]>("stable")).toEqual([stableIds[1], stableIds[2], stableIds[0]])
  })

  it("cleans orphaned selection and clipboard ids when props shrink externally", async () => {
    const { rerender } = render(<ControlledHarness intervals={baseIntervals} />)

    const stableIds = readJson<string[]>("stable")
    fireEvent.click(screen.getByText("plain-0"))
    fireEvent.click(screen.getByText("meta-1"))
    fireEvent.click(screen.getByText("copy"))

    rerender(<ControlledHarness intervals={baseIntervals.slice(0, 1)} />)

    await waitFor(() => {
      expect(readJson<string[]>("selected")).toEqual([stableIds[0]])
      expect(readJson<string[]>("clipboard")).toEqual([stableIds[0]])
    })
  })
})

describe("WorkoutEditor imperative handle", () => {
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
})
