import { ClipboardPaste, Plus } from "lucide-react"

interface InsertZoneProps {
  x: number
  index: number
  height: number
  onInsert: (index: number) => void
  /** When true, a second button is shown allowing the caller to paste at this index. */
  canPaste?: boolean
  onPaste?: (index: number) => void
}

/**
 * Invisible hit zone rendered at the boundary between two interval blocks.
 * On hover, reveals a "+" button to insert a new interval at that position.
 * When `canPaste` is true, also reveals a paste button next to it.
 */
export function InsertZone({
  x,
  index,
  height,
  onInsert,
  canPaste = false,
  onPaste,
}: InsertZoneProps) {
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
    >
      {/* Dashed vertical line indicator on hover (centred on the boundary) */}
      <div className="pointer-events-none absolute top-0 left-1/2 h-full -translate-x-1/2 border-l-2 border-dashed border-primary/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />

      {/* Button group at vertical centre. Stays hidden until the zone is hovered. */}
      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-primary text-primary-foreground shadow-sm"
          onClick={(e) => {
            e.stopPropagation()
            onInsert(index)
          }}
          title="Insert interval"
        >
          <Plus className="size-4" />
        </button>

        {canPaste && onPaste && (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-secondary text-secondary-foreground shadow-sm"
            onClick={(e) => {
              e.stopPropagation()
              onPaste(index)
            }}
            title="Paste here"
          >
            <ClipboardPaste className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
