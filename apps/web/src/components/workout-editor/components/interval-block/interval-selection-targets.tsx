import type { DragType } from "@/lib/timeline/types"
import type { WorkoutEditorSelectedSectionTarget } from "../../store"
import {
  CORNER_HIT_RADIUS,
  EDGE_HIT_WIDTH,
  EDITOR_HEIGHT,
  HANDLE_SIZE,
} from "@/lib/timeline/types"

interface IntervalSelectionTargetsProps {
  width: number
  startYPx: number
  endYPx: number
  startColor: string
  endColor: string
  index: number
  isSelected: boolean
  isDragging: boolean
  showSubsectionTargets: boolean
  activeTarget: WorkoutEditorSelectedSectionTarget | null
  onStartDrag: (e: React.PointerEvent, type: DragType, index: number) => void
  onHover: (index: number | null) => void
  onSelectTarget: (target: WorkoutEditorSelectedSectionTarget) => void
}

export function IntervalSelectionTargets({
  width,
  startYPx,
  endYPx,
  startColor,
  endColor,
  index,
  isSelected,
  isDragging,
  showSubsectionTargets,
  activeTarget,
  onStartDrag,
  onHover,
  onSelectTarget,
}: IntervalSelectionTargetsProps) {
  if (!isSelected) {
    return null
  }

  const handlePointerEnter = () => {
    if (!isDragging) onHover(index)
  }
  const handlePointerLeave = () => {
    if (!isDragging) onHover(null)
  }

  const cornerInset = CORNER_HIT_RADIUS
  const hitHalf = EDGE_HIT_WIDTH / 2
  const leftInsetY =
    startYPx + ((endYPx - startYPx) * cornerInset) / Math.max(width, 1)
  const rightInsetY =
    endYPx - ((endYPx - startYPx) * cornerInset) / Math.max(width, 1)

  const handleTargetPointerDown =
    (target: WorkoutEditorSelectedSectionTarget, dragType: DragType) =>
    (event: React.PointerEvent) => {
      event.stopPropagation()
      if (showSubsectionTargets) {
        onSelectTarget(target)
      }
      onStartDrag(event, dragType, index)
    }

  const handleTargetClick =
    (target: WorkoutEditorSelectedSectionTarget) =>
    (event: React.MouseEvent) => {
      event.stopPropagation()
      if (showSubsectionTargets) {
        onSelectTarget(target)
      }
    }

  return (
    <>
      <div
        className="absolute"
        style={{
          right: -(EDGE_HIT_WIDTH / 2),
          top: Math.min(startYPx, endYPx),
          width: EDGE_HIT_WIDTH,
          height: EDITOR_HEIGHT - Math.min(startYPx, endYPx),
          cursor: "ew-resize",
        }}
        onPointerDown={(event) => {
          event.stopPropagation()
          onStartDrag(event, "duration", index)
        }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

      <div
        className="absolute"
        style={{
          left: -(EDGE_HIT_WIDTH / 2),
          top: Math.min(startYPx, endYPx),
          width: EDGE_HIT_WIDTH,
          height: EDITOR_HEIGHT - Math.min(startYPx, endYPx),
          cursor: "ew-resize",
        }}
        onPointerDown={(event) => {
          event.stopPropagation()
          onStartDrag(event, "duration-left", index)
        }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      />

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
        onClick={handleTargetClick("power-uniform")}
        onPointerDown={handleTargetPointerDown("power-uniform", "power-uniform")}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        data-editor-interval-index={index}
        data-editor-section-target="power-uniform"
      />

      <div
        className="absolute rounded-full"
        style={{
          left: -CORNER_HIT_RADIUS,
          top: startYPx - CORNER_HIT_RADIUS,
          width: CORNER_HIT_RADIUS * 2,
          height: CORNER_HIT_RADIUS * 2,
          cursor: "ns-resize",
        }}
        onClick={handleTargetClick("power-start")}
        onPointerDown={handleTargetPointerDown("power-start", "power-start")}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        data-editor-interval-index={index}
        data-editor-section-target="power-start"
      />

      <div
        className="absolute rounded-full"
        style={{
          right: -CORNER_HIT_RADIUS,
          top: endYPx - CORNER_HIT_RADIUS,
          width: CORNER_HIT_RADIUS * 2,
          height: CORNER_HIT_RADIUS * 2,
          cursor: "ns-resize",
        }}
        onClick={handleTargetClick("power-end")}
        onPointerDown={handleTargetPointerDown("power-end", "power-end")}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        data-editor-interval-index={index}
        data-editor-section-target="power-end"
      />

      {showSubsectionTargets && (
        <>
          <div
            className="pointer-events-none absolute"
            style={{
              inset: 0,
              clipPath: `polygon(
                ${cornerInset}px ${leftInsetY - 2}px,
                ${width - cornerInset}px ${rightInsetY - 2}px,
                ${width - cornerInset}px ${rightInsetY + 2}px,
                ${cornerInset}px ${leftInsetY + 2}px
              )`,
              background:
                activeTarget === "power-uniform"
                  ? "color-mix(in srgb, var(--color-foreground) 75%, transparent)"
                  : "color-mix(in srgb, var(--color-foreground) 20%, transparent)",
              opacity: activeTarget === "power-uniform" ? 0.95 : 0.45,
            }}
          />

          <div
            className="pointer-events-none absolute rounded-full border-2 shadow-sm"
            style={{
              left: -(HANDLE_SIZE / 2),
              top: startYPx - HANDLE_SIZE / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor:
                activeTarget === "power-start"
                  ? "var(--color-foreground)"
                  : "white",
              borderColor:
                activeTarget === "power-start"
                  ? "var(--color-foreground)"
                  : startColor,
              boxShadow:
                activeTarget === "power-start"
                  ? `0 0 0 3px color-mix(in srgb, ${startColor} 35%, transparent)`
                  : undefined,
            }}
          />

          <div
            className="pointer-events-none absolute rounded-full border-2 shadow-sm"
            style={{
              right: -(HANDLE_SIZE / 2),
              top: endYPx - HANDLE_SIZE / 2,
              width: HANDLE_SIZE,
              height: HANDLE_SIZE,
              backgroundColor:
                activeTarget === "power-end"
                  ? "var(--color-foreground)"
                  : "white",
              borderColor:
                activeTarget === "power-end"
                  ? "var(--color-foreground)"
                  : endColor,
              boxShadow:
                activeTarget === "power-end"
                  ? `0 0 0 3px color-mix(in srgb, ${endColor} 35%, transparent)`
                  : undefined,
            }}
          />
        </>
      )}

      <div
        className="pointer-events-none absolute border-l-2 border-dashed border-current opacity-20"
        style={{
          left: 0,
          top: startYPx + HANDLE_SIZE / 2 + 2,
          height: EDITOR_HEIGHT - startYPx - HANDLE_SIZE / 2 - 2,
        }}
      />

      <div
        className="pointer-events-none absolute border-l-2 border-dashed border-current opacity-20"
        style={{
          right: 0,
          top: endYPx + HANDLE_SIZE / 2 + 2,
          height: EDITOR_HEIGHT - endYPx - HANDLE_SIZE / 2 - 2,
        }}
      />
    </>
  )
}
