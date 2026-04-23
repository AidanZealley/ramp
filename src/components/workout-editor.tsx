import { useState, useRef, useCallback, useEffect } from "react";
import type { Interval } from "@/lib/workout-utils";
import {
  formatDuration,
  formatPower,
  snap,
  clamp,
  computeMaxPower,
} from "@/lib/workout-utils";
import { getZoneColor, getZoneInfo } from "@/lib/zones";

// --- Constants ---
const EDITOR_HEIGHT = 280;
const AXIS_HEIGHT = 28;
const PIXELS_PER_SECOND = 2;
const HANDLE_RADIUS = 5;
const CORNER_HIT_RADIUS = 12;
const EDGE_HIT_WIDTH = 12;
const MIN_POWER = 0;
const MIN_DURATION = 30;
const DURATION_SNAP = 30;

type DragType =
  | "power-uniform"
  | "power-start"
  | "power-end"
  | "duration"
  | "duration-left"
  | "move";

interface WorkoutEditorProps {
  intervals: Interval[];
  powerMode: "absolute" | "percentage";
  ftp: number;
  onIntervalsChange: (intervals: Interval[]) => void;
}

export function WorkoutEditor({
  intervals,
  powerMode,
  ftp,
  onIntervalsChange,
}: WorkoutEditorProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const cleanupRef = useRef<(() => void) | null>(null);

  const [dragPreview, setDragPreview] = useState<Interval[] | null>(null);
  const [moveState, setMoveState] = useState<{
    index: number;
    dx: number;
  } | null>(null);
  const [activeDrag, setActiveDrag] = useState<{
    type: DragType;
    index: number;
  } | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const displayIntervals = dragPreview ?? intervals;
  const maxPower = computeMaxPower(displayIntervals, powerMode);
  const powerSnap = powerMode === "absolute" ? 5 : 1;
  const totalWidth = Math.max(
    displayIntervals.reduce(
      (sum, i) => sum + i.durationSeconds * PIXELS_PER_SECOND,
      0
    ),
    300
  );

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) cleanupRef.current();
    };
  }, []);

  // --- Coordinate helpers ---
  const powerToY = useCallback(
    (power: number) => {
      return EDITOR_HEIGHT * (1 - power / maxPower);
    },
    [maxPower]
  );

  const getIntervalX = useCallback(
    (index: number, ivs: Interval[] = displayIntervals) => {
      return ivs
        .slice(0, index)
        .reduce((sum, i) => sum + i.durationSeconds * PIXELS_PER_SECOND, 0);
    },
    [displayIntervals]
  );

  const getSvgCoords = useCallback(
    (e: PointerEvent | React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const pt = new DOMPoint(e.clientX, e.clientY);
      const svgPt = pt.matrixTransform(svg.getScreenCTM()!.inverse());
      return { x: svgPt.x, y: svgPt.y };
    },
    []
  );

  // --- Power ticks for grid lines ---
  const powerTickStep = powerMode === "absolute" ? 50 : 20;
  const powerTicks: number[] = [];
  for (let p = powerTickStep; p < maxPower; p += powerTickStep) {
    powerTicks.push(p);
  }

  // --- Time ticks ---
  const totalDurationSec = displayIntervals.reduce(
    (s, i) => s + i.durationSeconds,
    0
  );
  const timeTickStep = totalDurationSec > 1800 ? 300 : 60;
  const timeTicks: number[] = [];
  for (let t = timeTickStep; t < totalDurationSec; t += timeTickStep) {
    timeTicks.push(t);
  }

  // --- Drag handlers ---
  const startDrag = useCallback(
    (
      e: React.PointerEvent,
      type: DragType,
      index: number
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const start = getSvgCoords(e);
      const original = intervals.map((i) => ({ ...i }));
      // Capture current maxPower at drag start for consistent delta calculations
      const dragMaxPower = computeMaxPower(original, powerMode);

      let latestPreview: Interval[] | null = null;

      const handleMove = (ev: PointerEvent) => {
        const current = getSvgCoords(ev);
        const dx = current.x - start.x;
        const dy = current.y - start.y;

        const newIntervals = original.map((i) => ({ ...i }));

        switch (type) {
          case "power-uniform": {
            const powerDelta = (-dy * dragMaxPower) / EDITOR_HEIGHT;
            newIntervals[index].startPower = clamp(
              snap(original[index].startPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            );
            newIntervals[index].endPower = clamp(
              snap(original[index].endPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            );
            break;
          }
          case "power-start": {
            const powerDelta = (-dy * dragMaxPower) / EDITOR_HEIGHT;
            newIntervals[index].startPower = clamp(
              snap(original[index].startPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            );
            break;
          }
          case "power-end": {
            const powerDelta = (-dy * dragMaxPower) / EDITOR_HEIGHT;
            newIntervals[index].endPower = clamp(
              snap(original[index].endPower + powerDelta, powerSnap),
              MIN_POWER,
              dragMaxPower
            );
            break;
          }
          case "duration": {
            const durationDelta = dx / PIXELS_PER_SECOND;
            newIntervals[index].durationSeconds = Math.max(
              MIN_DURATION,
              snap(original[index].durationSeconds + durationDelta, DURATION_SNAP)
            );
            break;
          }
          case "duration-left": {
            // Drag left = grow, drag right = shrink. Preceding intervals are untouched;
            // the current interval expands/contracts and everything after shifts.
            const durationDelta = -dx / PIXELS_PER_SECOND;
            newIntervals[index].durationSeconds = Math.max(
              MIN_DURATION,
              snap(original[index].durationSeconds + durationDelta, DURATION_SNAP)
            );
            break;
          }
          case "move": {
            // For move: show the interval at offset position
            setMoveState({ index, dx });

            // Calculate insertion point
            const movedInterval = original[index];
            const remaining = original.filter((_, i) => i !== index);
            const originalX = original
              .slice(0, index)
              .reduce(
                (sum, iv) => sum + iv.durationSeconds * PIXELS_PER_SECOND,
                0
              );
            const draggedCenterX =
              originalX +
              (movedInterval.durationSeconds * PIXELS_PER_SECOND) / 2 +
              dx;

            // Find insertion index in remaining array
            let cumX = 0;
            let insertIdx = remaining.length;
            for (let i = 0; i < remaining.length; i++) {
              const midX =
                cumX +
                (remaining[i].durationSeconds * PIXELS_PER_SECOND) / 2;
              if (draggedCenterX < midX) {
                insertIdx = i;
                break;
              }
              cumX += remaining[i].durationSeconds * PIXELS_PER_SECOND;
            }

            const reordered = [...remaining];
            reordered.splice(insertIdx, 0, movedInterval);
            latestPreview = reordered;
            // Don't call setDragPreview for move - we handle visuals via moveState
            return;
          }
        }

        latestPreview = newIntervals;
        setDragPreview(newIntervals);
      };

      const handleUp = () => {
        if (latestPreview) {
          onIntervalsChange(latestPreview);
        }
        setDragPreview(null);
        setMoveState(null);
        setActiveDrag(null);
        cleanup();
      };

      const cleanup = () => {
        window.removeEventListener("pointermove", handleMove);
        window.removeEventListener("pointerup", handleUp);
        cleanupRef.current = null;
      };

      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp);
      cleanupRef.current = cleanup;

      setActiveDrag({ type, index });
    },
    [intervals, powerMode, powerSnap, maxPower, getSvgCoords, onIntervalsChange]
  );

  // --- Delete interval ---
  const handleDeleteInterval = useCallback(
    (index: number) => {
      const newIntervals = intervals.filter((_, i) => i !== index);
      onIntervalsChange(newIntervals);
    },
    [intervals, onIntervalsChange]
  );

  const isDragging = activeDrag !== null;

  return (
    <div className="flex select-none">
      {/* Y-axis labels */}
      <div
        className="relative w-12 flex-shrink-0"
        style={{ height: EDITOR_HEIGHT }}
      >
        {powerTicks.map((power) => (
          <span
            key={power}
            className="absolute right-1 -translate-y-1/2 text-[10px] tabular-nums text-muted-foreground"
            style={{ top: powerToY(power) }}
          >
            {powerMode === "absolute" ? `${power}` : `${power}%`}
          </span>
        ))}
      </div>

      {/* SVG editor area */}
      <div className="flex-1 overflow-x-auto rounded-lg border border-border/50 bg-muted/20">
        <svg
          ref={svgRef}
          width={totalWidth + 20}
          height={EDITOR_HEIGHT + AXIS_HEIGHT}
          className="block"
        >
          {/* Grid lines */}
          {powerTicks.map((power) => {
            const y = powerToY(power);
            return (
              <line
                key={`grid-h-${power}`}
                x1={0}
                y1={y}
                x2={totalWidth + 20}
                y2={y}
                stroke="currentColor"
                strokeOpacity={0.06}
                strokeWidth={1}
              />
            );
          })}
          {timeTicks.map((t) => {
            const x = t * PIXELS_PER_SECOND;
            return (
              <g key={`grid-v-${t}`}>
                <line
                  x1={x}
                  y1={0}
                  x2={x}
                  y2={EDITOR_HEIGHT}
                  stroke="currentColor"
                  strokeOpacity={0.06}
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={EDITOR_HEIGHT + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px]"
                >
                  {formatDuration(t)}
                </text>
              </g>
            );
          })}

          {/* FTP reference line */}
          {(() => {
            const ftpPower = powerMode === "absolute" ? ftp : 100;
            const ftpY = powerToY(ftpPower);
            if (ftpPower > maxPower || ftpPower <= 0) return null;
            return (
              <g pointerEvents="none">
                <line
                  x1={0}
                  y1={ftpY}
                  x2={totalWidth + 20}
                  y2={ftpY}
                  stroke="currentColor"
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  strokeDasharray="6 4"
                />
                <text
                  x={totalWidth + 16}
                  y={ftpY - 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-[9px] font-medium"
                >
                  FTP
                </text>
              </g>
            );
          })()}

          {/* Baseline */}
          <line
            x1={0}
            y1={EDITOR_HEIGHT}
            x2={totalWidth + 20}
            y2={EDITOR_HEIGHT}
            stroke="currentColor"
            strokeOpacity={0.12}
            strokeWidth={1}
          />

          {/* Interval blocks */}
          {displayIntervals.map((interval, i) => {
            const x = getIntervalX(i);
            const w = interval.durationSeconds * PIXELS_PER_SECOND;
            const y1 = powerToY(interval.startPower);
            const y2 = powerToY(interval.endPower);

            const startColor = getZoneColor(
              interval.startPower,
              ftp,
              powerMode
            );
            const endColor = getZoneColor(interval.endPower, ftp, powerMode);
            const avgPower =
              (interval.startPower + interval.endPower) / 2;
            const zoneInfo = getZoneInfo(avgPower, ftp, powerMode);

            const isHovered = hoveredIndex === i && !isDragging;
            const isDragTarget =
              activeDrag?.index === i &&
              activeDrag?.type !== "move";
            const isBeingMoved =
              moveState?.index === i;

            // For move drag, apply offset to original position
            const translateX = isBeingMoved ? moveState.dx : 0;

            const gradientId = `zone-grad-${i}`;

            return (
              <g
                key={i}
                style={{
                  transform: isBeingMoved
                    ? `translateX(${translateX}px)`
                    : undefined,
                  opacity: isBeingMoved ? 0.6 : 1,
                }}
              >
                {/* Gradient definition */}
                <defs>
                  <linearGradient
                    id={gradientId}
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor={startColor} />
                    <stop offset="100%" stopColor={endColor} />
                  </linearGradient>
                </defs>

                {/* Main block shape */}
                <polygon
                  points={`${x},${y1} ${x + w},${y2} ${x + w},${EDITOR_HEIGHT} ${x},${EDITOR_HEIGHT}`}
                  fill={`url(#${gradientId})`}
                  fillOpacity={0.6}
                  stroke={
                    isDragTarget
                      ? "var(--color-primary)"
                      : isHovered
                        ? "currentColor"
                        : "transparent"
                  }
                  strokeOpacity={isDragTarget ? 0.8 : 0.15}
                  strokeWidth={isDragTarget ? 2 : 1}
                  onPointerEnter={() => {
                    if (!isDragging) setHoveredIndex(i);
                  }}
                  onPointerLeave={() => {
                    if (!isDragging) setHoveredIndex(null);
                  }}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  onPointerDown={(e) => startDrag(e, "move", i)}
                />

                {/* Power label */}
                {w > 50 && (
                  <text
                    x={x + w / 2}
                    y={Math.min(y1, y2) - 8}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground text-[10px] font-medium"
                  >
                    {interval.startPower === interval.endPower
                      ? formatPower(interval.startPower, powerMode)
                      : `${formatPower(interval.startPower, powerMode)}–${formatPower(interval.endPower, powerMode)}`}
                  </text>
                )}

                {/* Zone label */}
                {w > 80 && EDITOR_HEIGHT - Math.max(y1, y2) > 36 && (
                  <text
                    x={x + w / 2}
                    y={EDITOR_HEIGHT - 22}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground/50 text-[9px]"
                  >
                    Z{zoneInfo.zone}
                  </text>
                )}

                {/* Duration label */}
                {w > 40 && (
                  <text
                    x={x + w / 2}
                    y={EDITOR_HEIGHT - 8}
                    textAnchor="middle"
                    className="pointer-events-none fill-foreground/40 text-[9px] tabular-nums"
                  >
                    {formatDuration(interval.durationSeconds)}
                  </text>
                )}

                {/* --- Hit areas (invisible, always present) --- */}

                {/* Right edge hit area (duration drag) */}
                <rect
                  x={x + w - EDGE_HIT_WIDTH / 2}
                  y={Math.min(y1, y2)}
                  width={EDGE_HIT_WIDTH}
                  height={EDITOR_HEIGHT - Math.min(y1, y2)}
                  fill="transparent"
                  pointerEvents="all"
                  style={{ cursor: "ew-resize" }}
                  onPointerDown={(e) => startDrag(e, "duration", i)}
                  onPointerEnter={() => {
                    if (!isDragging) setHoveredIndex(i);
                  }}
                  onPointerLeave={() => {
                    if (!isDragging) setHoveredIndex(null);
                  }}
                />

                {/* Left edge hit area (duration-left drag) */}
                <rect
                  x={x}
                  y={Math.min(y1, y2)}
                  width={EDGE_HIT_WIDTH}
                  height={EDITOR_HEIGHT - Math.min(y1, y2)}
                  fill="transparent"
                  pointerEvents="all"
                  style={{ cursor: "ew-resize" }}
                  onPointerDown={(e) => startDrag(e, "duration-left", i)}
                  onPointerEnter={() => {
                    if (!isDragging) setHoveredIndex(i);
                  }}
                  onPointerLeave={() => {
                    if (!isDragging) setHoveredIndex(null);
                  }}
                />

                {/* Top edge hit area (uniform power drag) */}
                <line
                  x1={x + CORNER_HIT_RADIUS}
                  y1={
                    y1 +
                    ((y2 - y1) * CORNER_HIT_RADIUS) / Math.max(w, 1)
                  }
                  x2={x + w - CORNER_HIT_RADIUS}
                  y2={
                    y2 -
                    ((y2 - y1) * CORNER_HIT_RADIUS) / Math.max(w, 1)
                  }
                  stroke="transparent"
                  strokeWidth={EDGE_HIT_WIDTH}
                  pointerEvents="all"
                  style={{ cursor: "ns-resize" }}
                  onPointerDown={(e) => startDrag(e, "power-uniform", i)}
                  onPointerEnter={() => {
                    if (!isDragging) setHoveredIndex(i);
                  }}
                  onPointerLeave={() => {
                    if (!isDragging) setHoveredIndex(null);
                  }}
                />

                {/* Top-left corner hit area */}
                <circle
                  cx={x}
                  cy={y1}
                  r={CORNER_HIT_RADIUS}
                  fill="transparent"
                  pointerEvents="all"
                  style={{ cursor: "ns-resize" }}
                  onPointerDown={(e) => startDrag(e, "power-start", i)}
                  onPointerEnter={() => {
                    if (!isDragging) setHoveredIndex(i);
                  }}
                  onPointerLeave={() => {
                    if (!isDragging) setHoveredIndex(null);
                  }}
                />

                {/* Top-right corner hit area */}
                <circle
                  cx={x + w}
                  cy={y2}
                  r={CORNER_HIT_RADIUS}
                  fill="transparent"
                  pointerEvents="all"
                  style={{ cursor: "ns-resize" }}
                  onPointerDown={(e) => startDrag(e, "power-end", i)}
                  onPointerEnter={() => {
                    if (!isDragging) setHoveredIndex(i);
                  }}
                  onPointerLeave={() => {
                    if (!isDragging) setHoveredIndex(null);
                  }}
                />

                {/* --- Visual handles (shown on hover) --- */}
                {(isHovered || isDragTarget) && (
                  <>
                    {/* Top-left handle */}
                    <circle
                      cx={x}
                      cy={y1}
                      r={HANDLE_RADIUS}
                      fill="white"
                      stroke={startColor}
                      strokeWidth={2}
                      pointerEvents="none"
                      className="drop-shadow-sm"
                    />
                    {/* Top-right handle */}
                    <circle
                      cx={x + w}
                      cy={y2}
                      r={HANDLE_RADIUS}
                      fill="white"
                      stroke={endColor}
                      strokeWidth={2}
                      pointerEvents="none"
                      className="drop-shadow-sm"
                    />
                    {/* Right edge indicator */}
                    <line
                      x1={x + w}
                      y1={y2 + HANDLE_RADIUS + 2}
                      x2={x + w}
                      y2={EDITOR_HEIGHT}
                      stroke="currentColor"
                      strokeOpacity={0.2}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                    />
                    {/* Left edge indicator */}
                    <line
                      x1={x}
                      y1={y1 + HANDLE_RADIUS + 2}
                      x2={x}
                      y2={EDITOR_HEIGHT}
                      stroke="currentColor"
                      strokeOpacity={0.2}
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      pointerEvents="none"
                    />
                    {/* Delete button */}
                    {!isDragging && w > 30 && (
                      <g
                        onClick={() => handleDeleteInterval(i)}
                        style={{ cursor: "pointer" }}
                        pointerEvents="all"
                      >
                        <circle
                          cx={x + w - 12}
                          cy={Math.min(y1, y2) + 12}
                          r={8}
                          fill="var(--color-destructive)"
                          fillOpacity={0.85}
                        />
                        <text
                          x={x + w - 12}
                          y={Math.min(y1, y2) + 16}
                          textAnchor="middle"
                          fill="white"
                          fontSize={13}
                          fontWeight="bold"
                          pointerEvents="none"
                        >
                          ×
                        </text>
                      </g>
                    )}
                  </>
                )}
              </g>
            );
          })}

          {/* Live drag value tooltip */}
          {activeDrag && dragPreview && activeDrag.type !== "move" && (
            <DragTooltip
              activeDrag={activeDrag}
              intervals={dragPreview}
              powerMode={powerMode}
              getIntervalX={(i) => getIntervalX(i, dragPreview)}
              powerToY={powerToY}
              svgWidth={totalWidth + 20}
            />
          )}
        </svg>
      </div>
    </div>
  );
}

// --- Drag tooltip sub-component ---
function DragTooltip({
  activeDrag,
  intervals,
  powerMode,
  getIntervalX,
  powerToY,
  svgWidth,
}: {
  activeDrag: { type: DragType; index: number };
  intervals: Interval[];
  powerMode: "absolute" | "percentage";
  getIntervalX: (index: number) => number;
  powerToY: (power: number) => number;
  svgWidth: number;
}) {
  const interval = intervals[activeDrag.index];
  if (!interval) return null;

  const x = getIntervalX(activeDrag.index);
  const w = interval.durationSeconds * PIXELS_PER_SECOND;

  let labelX: number;
  let labelY: number;
  let label: string;

  switch (activeDrag.type) {
    case "power-uniform":
      labelX = x + w / 2;
      labelY = Math.min(powerToY(interval.startPower), powerToY(interval.endPower)) - 20;
      label =
        interval.startPower === interval.endPower
          ? formatPower(interval.startPower, powerMode)
          : `${formatPower(interval.startPower, powerMode)}–${formatPower(interval.endPower, powerMode)}`;
      break;
    case "power-start":
      labelX = x;
      labelY = powerToY(interval.startPower) - 20;
      label = formatPower(interval.startPower, powerMode);
      break;
    case "power-end":
      labelX = x + w;
      labelY = powerToY(interval.endPower) - 20;
      label = formatPower(interval.endPower, powerMode);
      break;
    case "duration":
      labelX = x + w;
      labelY = powerToY(Math.max(interval.startPower, interval.endPower)) - 20;
      label = formatDuration(interval.durationSeconds);
      break;
    case "duration-left":
      labelX = x;
      labelY = powerToY(Math.max(interval.startPower, interval.endPower)) - 20;
      label = formatDuration(interval.durationSeconds);
      break;
    default:
      return null;
  }

  // Keep the badge fully inside the SVG viewport (half-width = 24px)
  const BADGE_HALF = 24;
  labelX = Math.max(BADGE_HALF, Math.min(labelX, svgWidth - BADGE_HALF));

  return (
    <g>
      <rect
        x={labelX - 24}
        y={labelY - 11}
        width={48}
        height={18}
        rx={4}
        fill="var(--color-foreground)"
        fillOpacity={0.9}
      />
      <text
        x={labelX}
        y={labelY + 2}
        textAnchor="middle"
        className="text-[10px] font-medium tabular-nums"
        fill="var(--color-background)"
      >
        {label}
      </text>
    </g>
  );
}
