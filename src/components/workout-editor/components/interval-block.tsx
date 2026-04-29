import { useSortable } from "@dnd-kit/sortable"
import {
  useWorkoutEditorActions,
  useWorkoutEditorDisplayMode,
  useWorkoutEditorFtp,
  useWorkoutEditorInterval,
  useWorkoutEditorIsHovered,
  useWorkoutEditorIsSelected,
} from "../store"
import { IntervalHandles } from "./interval-handles"
import type { Interval } from "@/lib/workout-utils"
import type { TimelineScale } from "@/hooks/use-timeline-scale"
import type { DragType } from "@/lib/timeline/types"
import {
  formatDuration,
  formatPower,
  percentageToWatts,
} from "@/lib/workout-utils"
import { getZoneColor, getZoneInfo } from "@/lib/zones"
import { EDITOR_HEIGHT } from "@/lib/timeline/types"
import { cn } from "@/lib/utils"

export interface SelectModifiers {
  shift: boolean
  meta: boolean
}

interface IntervalBlockProps {
  stableId: string
  index: number
  scale: TimelineScale
  isDragTarget: boolean
  isDragging: boolean
  onStartDrag: (e: React.PointerEvent, type: DragType, index: number) => void
}

export function IntervalBlock({
  stableId,
  index,
  scale,
  isDragTarget,
  isDragging,
  onStartDrag,
}: IntervalBlockProps) {
  const interval = useWorkoutEditorInterval(index)
  const ftp = useWorkoutEditorFtp()
  const displayMode = useWorkoutEditorDisplayMode()
  const isHovered = useWorkoutEditorIsHovered(index)
  const isSelected = useWorkoutEditorIsSelected(stableId)
  const actions = useWorkoutEditorActions()
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
  const displayW = Math.max(1, w - 1)
  const startYPx = scale.powerToY(interval.startPower)
  const endYPx = scale.powerToY(interval.endPower)
  const startPowerPct = (startYPx / EDITOR_HEIGHT) * 100
  const endPowerPct = (endYPx / EDITOR_HEIGHT) * 100

  const startColor = getZoneColor(interval.startPower)
  const endColor = getZoneColor(interval.endPower)
  const startZone = getZoneInfo(interval.startPower).zone
  const endZone = getZoneInfo(interval.endPower).zone
  const zoneLabel =
    startZone === endZone
      ? `Z${startZone}`
      : `Z${Math.min(startZone, endZone)}-Z${Math.max(startZone, endZone)}`

  const isActive = isHovered || isSelected || isDragTarget
  const formatSecondaryPower = (power: number) =>
    displayMode === "absolute"
      ? `${Math.round(power)}%`
      : `${percentageToWatts(power, ftp)}W`

  const isRamp = interval.startPower !== interval.endPower
  const showSecondary = ftp > 0 && w > 65

  const style: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: 0,
    width: displayW,
    height: EDITOR_HEIGHT,
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
      onFocus={(event) => {
        if (event.target.matches(":focus-visible")) {
          actions.focusSelect(stableId)
        }
      }}
      {...attributes}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: `polygon(0% ${startPowerPct}%, 100% ${endPowerPct}%, 100% 100%, 0% 100%)`,
          background: `linear-gradient(to right, ${startColor}, ${endColor})`,
          opacity: 0.8,
          cursor: isDragging ? "grabbing" : "grab",
        }}
        {...listeners}
        onClick={(event) => {
          event.stopPropagation()
          actions.selectWithModifiers(stableId, {
            shift: event.shiftKey,
            meta: event.metaKey || event.ctrlKey,
          })
        }}
        onPointerEnter={() => {
          if (!isDragging) {
            actions.setHoveredIndex(index)
          }
        }}
        onPointerLeave={() => {
          if (!isDragging) {
            actions.setHoveredIndex(null)
          }
        }}
        data-editor-interval-index={index}
      />

      {isActive && (
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

      {w > 50 && (
        <div
          className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-0.5"
          style={{
            top: Math.min(startYPx, endYPx) - (showSecondary ? 28 : 20),
          }}
        >
          <span className="text-[11px] leading-none font-semibold text-foreground tabular-nums">
            {isRamp
              ? `${formatPower(interval.startPower, displayMode, ftp)}–${formatPower(interval.endPower, displayMode, ftp)}`
              : formatPower(interval.startPower, displayMode, ftp)}
          </span>
          {showSecondary && (
            <span className="text-[9px] leading-none text-foreground/50 tabular-nums">
              {isRamp
                ? `${formatSecondaryPower(interval.startPower)}–${formatSecondaryPower(interval.endPower)}`
                : formatSecondaryPower(interval.startPower)}
            </span>
          )}
        </div>
      )}

      {w > 40 && (
        <div
          className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 flex-col items-center gap-1"
          style={{ bottom: 8 }}
        >
          <span className="text-[10px] leading-none font-semibold text-foreground/70">
            {zoneLabel}
          </span>
          <span className="text-[10px] leading-none font-medium text-foreground/60 tabular-nums">
            {formatDuration(interval.durationSeconds)}
          </span>
        </div>
      )}

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
        onHover={actions.setHoveredIndex}
      />
    </div>
  )
}

export function IntervalBlockOverlay({
  interval,
  scale,
}: {
  interval: Interval
  scale: TimelineScale
}) {
  const w = scale.getIntervalWidth(interval)
  const startYPx = scale.powerToY(interval.startPower)
  const endYPx = scale.powerToY(interval.endPower)
  const startPowerPct = (startYPx / EDITOR_HEIGHT) * 100
  const endPowerPct = (endYPx / EDITOR_HEIGHT) * 100

  const startColor = getZoneColor(interval.startPower)
  const endColor = getZoneColor(interval.endPower)

  return (
    <div
      style={{
        width: w,
        height: EDITOR_HEIGHT,
        opacity: 0.8,
        filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.3))",
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: `polygon(0% ${startPowerPct}%, 100% ${endPowerPct}%, 100% 100%, 0% 100%)`,
          background: `linear-gradient(to right, ${startColor}, ${endColor})`,
          opacity: 0.8,
        }}
      />
    </div>
  )
}
