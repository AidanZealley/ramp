import { ClipboardPaste, Plus } from "lucide-react"
import {
  useWorkoutEditorActions,
  useWorkoutEditorHasClipboard,
} from "../store"

interface InsertZoneProps {
  x: number
  index: number
  height: number
}

export function InsertZone({ x, index, height }: InsertZoneProps) {
  const canPaste = useWorkoutEditorHasClipboard()
  const actions = useWorkoutEditorActions()

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
      <div className="pointer-events-none absolute top-0 left-1/2 h-full -translate-x-1/2 border-l-2 border-dashed border-primary/30 opacity-0 transition-opacity duration-150 group-hover:opacity-100" />

      <div className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col justify-center gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
        <button
          type="button"
          className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-primary text-primary-foreground shadow-sm"
          onClick={(event) => {
            event.stopPropagation()
            actions.insertAt(index)
          }}
          title="Insert interval"
          data-editor-action
        >
          <Plus className="size-4" />
        </button>

        {canPaste && (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full border border-border/50 bg-secondary text-secondary-foreground shadow-sm"
            onClick={(event) => {
              event.stopPropagation()
              actions.pasteClipboard(index)
            }}
            title="Paste here"
            data-editor-action
          >
            <ClipboardPaste className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
