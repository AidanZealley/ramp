import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import {
  useWorkoutEditorActions,
  useWorkoutEditorDisplayMode,
  useWorkoutEditorFtp,
  useWorkoutEditorSelectedIntervals,
} from "../store"
import type { SelectedIntervalRow } from "../store"
import type { Interval, PowerDisplayMode } from "@/lib/workout-utils"
import { formatDuration, formatPower } from "@/lib/workout-utils"
import { getZoneInfo } from "@/lib/zones"
import { cn } from "@/lib/utils"

function getZoneLabel(interval: Interval): string {
  const startZone = getZoneInfo(interval.startPower).zone
  const endZone = getZoneInfo(interval.endPower).zone
  return startZone === endZone
    ? `Z${startZone}`
    : `Z${Math.min(startZone, endZone)}–Z${Math.max(startZone, endZone)}`
}

function getPowerLabel(
  interval: Interval,
  displayMode: PowerDisplayMode,
  ftp: number
): string {
  const isRamp = interval.startPower !== interval.endPower
  if (!isRamp) {
    return formatPower(interval.startPower, displayMode, ftp)
  }
  return `${formatPower(interval.startPower, displayMode, ftp)}–${formatPower(
    interval.endPower,
    displayMode,
    ftp
  )}`
}

function ShapeGlyph({ interval }: { interval: Interval }) {
  if (interval.startPower === interval.endPower) {
    return (
      <Minus
        className="size-3.5 shrink-0 text-foreground/55"
        aria-label="Steady interval"
      />
    )
  }
  if (interval.endPower > interval.startPower) {
    return (
      <TrendingUp
        className="size-3.5 shrink-0 text-foreground/55"
        aria-label="Ramp up"
      />
    )
  }
  return (
    <TrendingDown
      className="size-3.5 shrink-0 text-foreground/55"
      aria-label="Ramp down"
    />
  )
}

interface SelectionDetailsRowProps {
  row: SelectedIntervalRow
  displayMode: PowerDisplayMode
  ftp: number
  onHover: (index: number | null) => void
  onClick: (id: string) => void
}

function SelectionDetailsRow({
  row,
  displayMode,
  ftp,
  onHover,
  onClick,
}: SelectionDetailsRowProps) {
  const { id, index, interval } = row
  const comment = interval.comment?.trim()
  return (
    <button
      type="button"
      onClick={() => onClick(id)}
      onPointerEnter={() => onHover(index)}
      onPointerLeave={() => onHover(null)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-xs",
        "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
      )}
    >
      <span className="w-7 shrink-0 text-right font-medium tabular-nums text-foreground/55">
        #{index + 1}
      </span>
      <ShapeGlyph interval={interval} />
      <span className="w-20 shrink-0 font-semibold tabular-nums text-foreground">
        {getPowerLabel(interval, displayMode, ftp)}
      </span>
      <span className="w-14 shrink-0 tabular-nums text-foreground/65">
        {getZoneLabel(interval)}
      </span>
      <span className="w-14 shrink-0 tabular-nums text-foreground/65">
        {formatDuration(interval.durationSeconds)}
      </span>
      <span
        className={cn(
          "min-w-0 flex-1 truncate",
          comment ? "text-foreground/70" : "text-foreground/35"
        )}
        title={comment || undefined}
      >
        {comment || "—"}
      </span>
    </button>
  )
}

export function SelectionDetails() {
  const rows = useWorkoutEditorSelectedIntervals()
  const displayMode = useWorkoutEditorDisplayMode()
  const ftp = useWorkoutEditorFtp()
  const actions = useWorkoutEditorActions()

  if (rows.length === 0) return null

  const totalDuration = rows.reduce(
    (sum, row) => sum + row.interval.durationSeconds,
    0
  )

  return (
    <div
      className="flex flex-col gap-1 rounded-2xl border border-border/50 bg-background/40 p-2"
      data-selection-toolbar
    >
      <div className="flex items-center justify-between px-1 text-xs font-medium text-foreground/70">
        <span>
          {rows.length} selected ·{" "}
          <span className="tabular-nums">{formatDuration(totalDuration)}</span>
        </span>
      </div>
      <div className="flex max-h-40 flex-col gap-0.5 overflow-y-auto">
        {rows.map((row) => (
          <SelectionDetailsRow
            key={row.id}
            row={row}
            displayMode={displayMode}
            ftp={ftp}
            onHover={actions.setHoveredIndex}
            onClick={actions.selectOne}
          />
        ))}
      </div>
    </div>
  )
}
