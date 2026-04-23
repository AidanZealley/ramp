import type { Interval } from "@/lib/workout-utils";
import { formatDuration, formatPower } from "@/lib/workout-utils";
import { getZoneColor, getZoneInfo } from "@/lib/zones";
import type { TimelineScale } from "@/hooks/use-timeline-scale";
import type { DragType } from "@/lib/timeline/types";
import { EDITOR_HEIGHT } from "@/lib/timeline/types";
import { IntervalHandles } from "./interval-handles";
import { useSortable } from "@dnd-kit/sortable";

interface IntervalBlockProps {
  stableId: string;
  interval: Interval;
  index: number;
  scale: TimelineScale;
  ftp: number;
  powerMode: "absolute" | "percentage";
  isHovered: boolean;
  isSelected: boolean;
  isDragTarget: boolean;
  isDragging: boolean; // any drag (resize or reorder) in progress
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
  onStartDrag: (e: React.PointerEvent, type: DragType, index: number) => void;
  onDelete: (index: number) => void;
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
  onStartDrag,
  onDelete,
}: IntervalBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortDragging,
  } = useSortable({ id: stableId });

  const x = scale.getIntervalX(index);
  const w = scale.getIntervalWidth(interval);

  // Power -> Y pixel positions (within this block's coordinate space)
  const startYPx = scale.powerToY(interval.startPower);
  const endYPx = scale.powerToY(interval.endPower);

  // Percentage positions for clip-path (relative to block height = EDITOR_HEIGHT)
  const startPowerPct = (startYPx / EDITOR_HEIGHT) * 100;
  const endPowerPct = (endYPx / EDITOR_HEIGHT) * 100;

  // Zone colors
  const startColor = getZoneColor(interval.startPower, ftp, powerMode);
  const endColor = getZoneColor(interval.endPower, ftp, powerMode);
  const startZone = getZoneInfo(interval.startPower, ftp, powerMode).zone;
  const endZone = getZoneInfo(interval.endPower, ftp, powerMode).zone;
  const zoneLabel =
    startZone === endZone
      ? `Z${startZone}`
      : `Z${Math.min(startZone, endZone)}-Z${Math.max(startZone, endZone)}`;

  const isActive = isHovered || isSelected || isDragTarget;

  // Build the style for the outer container
  const style: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: 0,
    width: w,
    height: EDITOR_HEIGHT,
    // dnd-kit transform: lock to horizontal axis only
    transform: transform
      ? `translate3d(${transform.x}px, 0, 0)`
      : undefined,
    transition: transition ?? undefined,
    opacity: isSortDragging ? 0.4 : 1,
    zIndex: isSortDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(index);
      }}
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
        onPointerEnter={() => {
          if (!isDragging) onHover(index);
        }}
        onPointerLeave={() => {
          if (!isDragging) onHover(null);
        }}
      />

      {/* Hover/select border — SVG polygon stroke follows the trapezoid exactly */}
      {(isActive || isDragTarget) && (
        <svg
          className="pointer-events-none absolute inset-0"
          width={w}
          height={EDITOR_HEIGHT}
          style={{ overflow: "visible" }}
        >
          <polygon
            points={`0,${startYPx} ${w},${endYPx} ${w},${EDITOR_HEIGHT} 0,${EDITOR_HEIGHT}`}
            fill="none"
            stroke={
              isDragTarget || isSelected ? "var(--color-primary)" : "currentColor"
            }
            strokeWidth={isDragTarget || isSelected ? 2 : 1}
            strokeOpacity={isDragTarget || isSelected ? 0.8 : 0.15}
          />
        </svg>
      )}

      {/* Power label */}
      {w > 50 && (
        <span
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[10px] font-medium text-foreground"
          style={{ top: Math.min(startYPx, endYPx) - 18 }}
        >
          {interval.startPower === interval.endPower
            ? formatPower(interval.startPower, powerMode)
            : `${formatPower(interval.startPower, powerMode)}–${formatPower(interval.endPower, powerMode)}`}
        </span>
      )}

      {/* Zone label */}
      {w > 80 && EDITOR_HEIGHT - Math.max(startYPx, endYPx) > 36 && (
        <span
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 text-[9px] text-foreground/50"
          style={{ top: EDITOR_HEIGHT - 30 }}
        >
          {zoneLabel}
        </span>
      )}

      {/* Duration label */}
      {w > 40 && (
        <span
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 tabular-nums text-[9px] text-foreground/40"
          style={{ top: EDITOR_HEIGHT - 16 }}
        >
          {formatDuration(interval.durationSeconds)}
        </span>
      )}

      {/* Resize/power handles */}
      <IntervalHandles
        width={w}
        startYPx={startYPx}
        endYPx={endYPx}
        startColor={startColor}
        endColor={endColor}
        index={index}
        isActive={isActive}
        isSelected={isSelected}
        isDragging={isDragging}
        onStartDrag={onStartDrag}
        onHover={onHover}
        onDelete={onDelete}
      />
    </div>
  );
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
  interval: Interval;
  scale: TimelineScale;
  ftp: number;
  powerMode: "absolute" | "percentage";
}) {
  const w = scale.getIntervalWidth(interval);
  const startYPx = scale.powerToY(interval.startPower);
  const endYPx = scale.powerToY(interval.endPower);
  const startPowerPct = (startYPx / EDITOR_HEIGHT) * 100;
  const endPowerPct = (endYPx / EDITOR_HEIGHT) * 100;

  const startColor = getZoneColor(interval.startPower, ftp, powerMode);
  const endColor = getZoneColor(interval.endPower, ftp, powerMode);

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
  );
}
