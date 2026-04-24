import { HugeiconsIcon } from "@hugeicons/react"
import { Add01Icon } from "@hugeicons/core-free-icons"

interface InsertZoneProps {
  x: number
  index: number
  height: number
  onInsert: (index: number) => void
}

/**
 * Invisible hit zone rendered at the boundary between two interval blocks.
 * On hover, reveals a "+" button to insert a new interval at that position.
 */
export function InsertZone({ x, index, height, onInsert }: InsertZoneProps) {
  return (
    <div
      className="group absolute"
      style={{
        left: x,
        top: 0,
        width: 16,
        height,
        transform: "translateX(-50%)",
        zIndex: 5,
        cursor: "pointer",
      }}
      onClick={(e) => {
        e.stopPropagation()
        onInsert(index)
      }}
    >
      {/* Dashed vertical line indicator on hover */}
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-full -translate-x-1/2 border-l-2 border-dashed border-primary/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      />

      {/* "+" button at vertical center */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-border/50 bg-primary text-primary-foreground shadow-sm opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <HugeiconsIcon icon={Add01Icon} size={14} />
      </div>
    </div>
  )
}
