import { useEffect, useRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { EditorMinimap } from "./components/editor-minimap"
import {
  WorkoutEditorStoreProvider,
  useWorkoutEditorActions,
  useWorkoutEditorStableIds,
} from "./store"
import type { Interval } from "@/lib/workout-utils"

const baseIntervals: Array<Interval> = [
  { startPower: 100, endPower: 100, durationSeconds: 60 },
  { startPower: 150, endPower: 150, durationSeconds: 120 },
  { startPower: 200, endPower: 200, durationSeconds: 180 },
]

let observedWidth = 300

class ResizeObserverMock {
  private callback: ResizeObserverCallback

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }

  observe(target: Element) {
    this.callback(
      [
        {
          target,
          contentRect: {
            width: observedWidth,
            height: 24,
            top: 0,
            right: observedWidth,
            bottom: 24,
            left: 0,
            x: 0,
            y: 0,
            toJSON: () => ({}),
          },
        } as ResizeObserverEntry,
      ],
      this
    )
  }

  unobserve() {}

  disconnect() {}
}

function setElementScrollMetrics(
  element: HTMLDivElement,
  {
    clientWidth,
    scrollWidth,
    scrollLeft,
  }: {
    clientWidth: number
    scrollWidth: number
    scrollLeft: number
  }
) {
  Object.defineProperties(element, {
    clientWidth: { configurable: true, value: clientWidth },
    scrollWidth: { configurable: true, value: scrollWidth },
    scrollLeft: { configurable: true, writable: true, value: scrollLeft },
  })
}

function SelectFirstInterval() {
  const actions = useWorkoutEditorActions()
  const stableIds = useWorkoutEditorStableIds()

  useEffect(() => {
    actions.selectWithModifiers(stableIds[0], {
      shift: false,
      meta: false,
    })
  }, [actions, stableIds])

  return null
}

function MinimapHarness({
  intervals = baseIntervals,
  selected = false,
  clientWidth,
  scrollWidth,
  scrollLeft = 0,
  edgeGutterPx = 50,
}: {
  intervals?: Array<Interval>
  selected?: boolean
  clientWidth: number
  scrollWidth: number
  scrollLeft?: number
  edgeGutterPx?: number
}) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)

  return (
    <WorkoutEditorStoreProvider
      serverIntervals={intervals}
      serverResetKey="workout-1:0"
      serverIntervalsRevision={0}
      displayMode="absolute"
      ftp={250}
    >
      <div
        ref={(element) => {
          if (!element) return
          setElementScrollMetrics(element, {
            clientWidth,
            scrollWidth,
            scrollLeft,
          })
          scrollContainerRef.current = element
        }}
        data-testid="scroll-container"
      />
      {selected && <SelectFirstInterval />}
      <EditorMinimap
        scrollContainerRef={scrollContainerRef}
        pixelsPerSecond={1}
        edgeGutterPx={edgeGutterPx}
      />
    </WorkoutEditorStoreProvider>
  )
}

function numberStyle(element: HTMLElement, property: keyof CSSStyleDeclaration) {
  return Number.parseFloat(String(element.style[property]))
}

describe("EditorMinimap", () => {
  beforeEach(() => {
    observedWidth = 300
    vi.stubGlobal("ResizeObserver", ResizeObserverMock)
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, "releasePointerCapture", {
      configurable: true,
      value: vi.fn(),
    })
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
      function getBoundingClientRect() {
        return {
          width: observedWidth,
          height: 24,
          top: 0,
          right: observedWidth,
          bottom: 24,
          left: 0,
          x: 0,
          y: 0,
          toJSON: () => ({}),
        }
      }
    )
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it("uses the measured minimap width for long workout rendering", async () => {
    observedWidth = 420
    const longIntervals = Array.from({ length: 10 }, (_, index) => ({
      startPower: 120 + index * 5,
      endPower: 120 + index * 5,
      durationSeconds: 600,
    }))

    render(
      <MinimapHarness
        intervals={longIntervals}
        clientWidth={900}
        scrollWidth={1200}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId("editor-minimap-content").style.width).toBe(
        "420px"
      )
    })
  })

  it("fills the minimap viewport when the editor has no horizontal overflow", async () => {
    render(<MinimapHarness clientWidth={600} scrollWidth={600} />)

    await waitFor(() => {
      const viewport = screen.getByTestId("editor-minimap-viewport")
      expect(viewport.style.left).toBe("0px")
      expect(viewport.style.width).toBe("300px")
    })
  })

  it("positions the viewport proportionally when the editor overflows", async () => {
    render(
      <MinimapHarness
        clientWidth={300}
        scrollWidth={1100}
        scrollLeft={400}
        edgeGutterPx={50}
      />
    )

    await waitFor(() => {
      const viewport = screen.getByTestId("editor-minimap-viewport")
      expect(numberStyle(viewport, "left")).toBeCloseTo(105)
      expect(numberStyle(viewport, "width")).toBeCloseTo(90)
    })
  })

  it("maps background clicks to the matching editor scroll position", async () => {
    render(
      <MinimapHarness
        clientWidth={300}
        scrollWidth={1100}
        scrollLeft={50}
        edgeGutterPx={50}
      />
    )

    await screen.findByTestId("editor-minimap")
    fireEvent.pointerDown(screen.getByTestId("editor-minimap"), {
      clientX: 150,
      pointerId: 1,
    })

    expect(screen.getByTestId("scroll-container").scrollLeft).toBeCloseTo(400)
  })

  it("keeps the selection mask aligned to normalized duration proportions", async () => {
    render(
      <MinimapHarness
        selected
        clientWidth={300}
        scrollWidth={700}
        intervals={baseIntervals}
      />
    )

    const mask = await screen.findByTestId("editor-minimap-selection-mask")
    const rects = mask.querySelectorAll("rect")

    expect(mask.getAttribute("viewBox")).toBe("0 0 200 100")
    expect(rects).toHaveLength(2)
    expect(rects[0].getAttribute("x")).toBe("33.33333333333333")
    expect(rects[0].getAttribute("width")).toBe("66.66666666666666")
    expect(rects[1].getAttribute("x")).toBe("99.99999999999999")
    expect(rects[1].getAttribute("width")).toBe("100")
  })
})
