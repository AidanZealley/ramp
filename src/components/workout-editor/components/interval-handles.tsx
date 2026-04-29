import type { DragType } from "@/lib/timeline/types"
import {
  CORNER_HIT_RADIUS,
  EDGE_HIT_WIDTH,
  EDITOR_HEIGHT,
  HANDLE_SIZE,
} from "@/lib/timeline/types"

interface IntervalHandlesProps {
  width: number
  startYPx: number
  endYPx: number
  startColor: string
  endColor: string
  index: number
  isSelected: boolean
  isDragging: boolean // any drag in progress globally
  onStartDrag: (e: React.PointerEvent, type: DragType, index: number) => void
  onHover: (index: number | null) => void
}

/**
 * Renders invisible hit areas and visible handle indicators for a single interval.
 * All elements are absolutely positioned within the interval block's coordinate space.
 *
 * Hit areas:
 * - Left/right edge strips for duration drag
 * - Angled parallelogram strip along the top edge for uniform power drag
 * - Corner circles for independent start/end power drag
 *
 * Visual handles (shown on hover/select):
 * - Corner circles with zone-colored borders
 * - Dashed edge indicator lines
 * - Delete button (selected only)
 */
export function IntervalHandles({
  width,
  startYPx,
  endYPx,
  startColor,
  endColor,
  index,
  isSelected,
  isDragging,
  onStartDrag,
  onHover,
}: IntervalHandlesProps) {
  const handlePointerEnter = () => {
    if (!isDragging) onHover(index)
  }
  const handlePointerLeave = () => {
    if (!isDragging) onHover(null)
  }

  // Top edge hit area: a clip-pathed parallelogram tracing the angled top edge.
  // Inset from corners so corner hit areas take priority.
  const cornerInset = CORNER_HIT_RADIUS
  const hitHalf = EDGE_HIT_WIDTH / 2

  // Interpolate Y at the corner inset points along the top edge
  const leftInsetY =
    startYPx + ((endYPx - startYPx) * cornerInset) / Math.max(width, 1)
  const rightInsetY =
    endYPx - ((endYPx - startYPx) * cornerInset) / Math.max(width, 1)

  return (
    <>
      {/* --- Invisible hit areas + visual handles (selected block only) --- */}
      {isSelected && (
        <>
          {/* Right edge hit area (duration drag) */}
          <div
            className="absolute"
            style={{
              right: -(EDGE_HIT_WIDTH / 2),
              top: Math.min(startYPx, endYPx),
              width: EDGE_HIT_WIDTH,
              height: EDITOR_HEIGHT - Math.min(startYPx, endYPx),
              cursor: "ew-resize",
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, "duration", index)
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />

          {/* Left edge hit area (duration-left drag) */}
          <div
            className="absolute"
            style={{
              left: -(EDGE_HIT_WIDTH / 2),
              top: Math.min(startYPx, endYPx),
              width: EDGE_HIT_WIDTH,
              height: EDITOR_HEIGHT - Math.min(startYPx, endYPx),
              cursor: "ew-resize",
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, "duration-left", index)
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />

          {/* Top edge hit area (uniform power drag) — clip-pathed parallelogram */}
          <div
            className="absolute inset-0"
            style={{
              clipPath: `polygon(
                ${cornerInset}px ${leftInsetY - hitHalf}px,
                ${width - cornerInset}px ${rightInsetY - hitHalf}px,
                ${width - cornerInset}px ${rightInsetY + hitHalf}px,
                ${cornerInset}px ${leftInsetY + hitHalf}px
              )`,
              cursor: "ns-resize",
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, "power-uniform", index)
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />

          {/* Top-left corner hit area (power-start drag) */}
          <div
            className="absolute rounded-full"
            style={{
              left: -CORNER_HIT_RADIUS,
              top: startYPx - CORNER_HIT_RADIUS,
              width: CORNER_HIT_RADIUS * 2,
              height: CORNER_HIT_RADIUS * 2,
              cursor: "ns-resize",
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, "power-start", index)
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />

          {/* Top-right corner hit area (power-end drag) */}
          <div
            className="absolute rounded-full"
            style={{
              right: -CORNER_HIT_RADIUS,
              top: endYPx - CORNER_HIT_RADIUS,
              width: CORNER_HIT_RADIUS * 2,
              height: CORNER_HIT_RADIUS * 2,
              cursor: "ns-resize",
            }}
            onPointerDown={(e) => {
              e.stopPropagation()
              onStartDrag(e, "power-end", index)
            }}
            onPointerEnter={handlePointerEnter}
            onPointerLeave={handlePointerLeave}
          />

          {/* Top-left handle circle */}
          <div
            className="pointer-events-none absolute rounded-full border-2 shadow-sm"
            style={{
              left: -(HANDLE_SIZE / 2),
              top: startYPx - HANDLE_SIZE / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor: "white",
              borderColor: startColor,
            }}
          />

          {/* Top-right handle circle */}
          <div
            className="pointer-events-none absolute rounded-full border-2 shadow-sm"
            style={{
              right: -(HANDLE_SIZE / 2),
              top: endYPx - HANDLE_SIZE / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor: "white",
              borderColor: endColor,
            }}
          />

          {/* Left edge dashed indicator */}
          <div
            className="pointer-events-none absolute border-l-2 border-dashed border-current opacity-20"
            style={{
              left: 0,
              top: startYPx + HANDLE_SIZE / 2 + 2,
              height: EDITOR_HEIGHT - startYPx - HANDLE_SIZE / 2 - 2,
            }}
          />

          {/* Right edge dashed indicator */}
          <div
            className="pointer-events-none absolute border-l-2 border-dashed border-current opacity-20"
            style={{
              right: 0,
              top: endYPx + HANDLE_SIZE / 2 + 2,
              height: EDITOR_HEIGHT - endYPx - HANDLE_SIZE / 2 - 2,
            }}
          />
        </>
      )}
    </>
  )
}
