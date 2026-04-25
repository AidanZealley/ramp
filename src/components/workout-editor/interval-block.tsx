import { useSortable } from "@dnd-kit/sortable"
import { IntervalHandles } from "./interval-handles"
import type { Interval } from "@/lib/workout-utils"
import type { TimelineScale } from "@/hooks/use-timeline-scale"
import type { DragType } from "@/lib/timeline/types"
import { formatDuration, formatPower } from "@/lib/workout-utils"
import { getZoneColor, getZoneInfo } from "@/lib/zones"
import { EDITOR_HEIGHT } from "@/lib/timeline/types"
import { cn } from "@/lib/utils"

/** Modifier state extracted from a pointer/mouse event at click time. */
export interface SelectModifiers {
  shift: boolean
  meta: boolean
}

interface IntervalBlockProps {
  stableId: string
  interval: Interval
  index: number
  scale: TimelineScale
  ftp: number
  powerMode: "absolute" | "percentage"
  isHovered: boolean
  isSelected: boolean
  isDragTarget: boolean
  isDragging: boolean // any drag (resize or reorder) in progress
  onHover: (index: number | null) => void
  onSelect: (stableId: string, mods: SelectModifiers) => void
  onFocusSelect: (stableId: string) => void
  onStartDrag: (e: React.PointerEvent, type: DragType, index: number) => void
}

/**
 * Renders a single interval as an absolutely-positioned div.
 * Uses CSS clip-path for the trapezoid shape and linear-gradient for zone colors.
 * Integrates with dnd-kit via useSortable for drag-to-reorder.
 */
export function IntervalBlock({
  stableId,
  interval,
  index,
  scale,
  ftp,
  powerMode,
  isHovered,
  isSelected,
  isDragTarget,
  isDragging,
  onHover,
  onSelect,
  onFocusSelect,
  onStartDrag,
}: IntervalBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortDragging,
  } = useSortable({ id: stableId })

  const x = scale.getIntervalX(index)
  const w = scale.getIntervalWidth(interval)
  // Leave a 1 px gap on the right so adjacent intervals are visually distinct
  const displayW = Math.max(1, w - 1)

  // Power -> Y pixel positions (within this block's coordinate space)
  const startYPx = scale.powerToY(interval.startPower)
  const endYPx = scale.powerToY(interval.endPower)

  // Percentage positions for clip-path (relative to block height = EDITOR_HEIGHT)
  const startPowerPct = (startYPx / EDITOR_HEIGHT) * 100
  const endPowerPct = (endYPx / EDITOR_HEIGHT) * 100

  // Zone colors
  const startColor = getZoneColor(interval.startPower, ftp, powerMode)
  const endColor = getZoneColor(interval.endPower, ftp, powerMode)
  const startZone = getZoneInfo(interval.startPower, ftp, powerMode).zone
  const endZone = getZoneInfo(interval.endPower, ftp, powerMode).zone
  const zoneLabel =
    startZone === endZone
      ? `Z${startZone}`
      : `Z${Math.min(startZone, endZone)}-Z${Math.max(startZone, endZone)}`

  const isActive = isHovered || isSelected || isDragTarget

  // Secondary power label (alternate unit). Only called when showSecondary is true (ftp > 0).
  const formatSecondaryPower = (power: number) =>
    powerMode === "absolute"
      ? `${Math.round((power / ftp) * 100)}%`
      : `${Math.round((power * ftp) / 100)}W`

  const isRamp = interval.startPower !== interval.endPower
  const showSecondary = ftp > 0 && w > 65

  // Build the style for the outer container
  const style: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: 0,
    width: displayW,
    height: EDITOR_HEIGHT,
    // dnd-kit transform: lock to horizontal axis only
    transform: transform ? `translate3d(${transform.x}px, 0, 0)` : undefined,
    transition: transition ?? undefined,
    opacity: isSortDragging ? 0.4 : 1,
    zIndex: isSortDragging ? 10 : undefined,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("outline-none", isSelected && "z-10")}
      onFocus={(e) => {
        // Only select on keyboard-initiated focus (Tab), not mouse clicks.
        // Mouse clicks already go through onClick → onSelect.
        if (e.target.matches(":focus-visible")) onFocusSelect(stableId)
      }}
      {...attributes}
    >
      {/* Trapezoid fill — clip-path creates the shape, gradient fills the zone colors */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: `polygon(0% ${startPowerPct}%, 100% ${endPowerPct}%, 100% 100%, 0% 100%)`,
          background: `linear-gradient(to right, ${startColor}, ${endColor})`,
          opacity: 0.6,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        // dnd-kit listeners on the body for drag-to-reorder
        {...listeners}
        onClick={(e) => {
          e.stopPropagation()
          onSelect(stableId, {
            shift: e.shiftKey,
            meta: e.metaKey || e.ctrlKey,
          })
        }}
        onPointerEnter={() => {
          if (!isDragging) onHover(index)
        }}
        onPointerLeave={() => {
          if (!isDragging) onHover(null)
        }}
      />

      {/* Hover/select border — SVG polygon stroke follows the trapezoid exactly */}
      {(isActive || isDragTarget) && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={displayW}
          height={EDITOR_HEIGHT}
          style={{ overflow: "visible" }}
        >
          <polygon
            points={`0,${startYPx} ${displayW},${endYPx} ${displayW},${EDITOR_HEIGHT} 0,${EDITOR_HEIGHT}`}
            fill="none"
            stroke={
              isDragTarget || isSelected
                ? "var(--color-foreground)"
                : "currentColor"
            }
            strokeWidth={isDragTarget || isSelected ? 2 : 1}
            strokeOpacity={isDragTarget || isSelected ? 0.8 : 0.15}
          />
        </svg>
      )}

      {/* Power label group — primary unit + secondary unit in smaller text */}
      {w > 50 && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5"
          style={{ top: Math.min(startYPx, endYPx) - (showSecondary ? 28 : 20) }}
        >
          {/* Primary power */}
          <span className="text-[11px] font-semibold leading-none tabular-nums text-foreground">
            {isRamp
              ? `${formatPower(interval.startPower, powerMode)}–${formatPower(interval.endPower, powerMode)}`
              : formatPower(interval.startPower, powerMode)}
          </span>
          {/* Secondary power (alternate unit) */}
          {showSecondary && (
            <span className="text-[9px] leading-none tabular-nums text-foreground/50">
              {isRamp
                ? `${formatSecondaryPower(interval.startPower)}–${formatSecondaryPower(interval.endPower)}`
                : formatSecondaryPower(interval.startPower)}
            </span>
          )}
        </div>
      )}

      {/* Bottom info group — zone + duration stacked */}
      {w > 40 && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          style={{ bottom: 8 }}
        >
          {w > 40 && (
            <span className="text-[10px] font-semibold leading-none text-foreground/70">
              {zoneLabel}
            </span>
          )}
          <span className="text-[10px] font-medium leading-none tabular-nums text-foreground/60">
            {formatDuration(interval.durationSeconds)}
          </span>
        </div>
      )}

      {/* Resize/power handles */}
      <IntervalHandles
        width={displayW}
        startYPx={startYPx}
        endYPx={endYPx}
        startColor={startColor}
        endColor={endColor}
        index={index}
        isSelected={isSelected}
        isDragging={isDragging}
        onStartDrag={onStartDrag}
        onHover={onHover}
      />
    </div>
  )
}

/**
 * Simplified interval block for the DragOverlay (no handles, no interaction).
 */
export function IntervalBlockOverlay({
  interval,
  scale,
  ftp,
  powerMode,
}: {
  interval: Interval
  scale: TimelineScale
  ftp: number
  powerMode: "absolute" | "percentage"
}) {
  const w = scale.getIntervalWidth(interval)
  const startYPx = scale.powerToY(interval.startPower)
  const endYPx = scale.powerToY(interval.endPower)
  const startPowerPct = (startYPx / EDITOR_HEIGHT) * 100
  const endPowerPct = (endYPx / EDITOR_HEIGHT) * 100

  const startColor = getZoneColor(interval.startPower, ftp, powerMode)
  const endColor = getZoneColor(interval.endPower, ftp, powerMode)

  return (
    <div
      style={{
        width: w,
        height: EDITOR_HEIGHT,
        opacity: 0.6,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: `polygon(0% ${startPowerPct}%, 100% ${endPowerPct}%, 100% 100%, 0% 100%)`,
          background: `linear-gradient(to right, ${startColor}, ${endColor})`,
          opacity: 0.6,
        }}
      />
    </div>
  )
}
