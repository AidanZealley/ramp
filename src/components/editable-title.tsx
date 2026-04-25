import { useState, useRef, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Check, X } from "lucide-react"

interface EditableTitleProps {
  value: string
  onChange: (value: string) => void
}

export function EditableTitle({ value, onChange }: EditableTitleProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      inputRef.current?.select()
    }
  }, [editing])

  const handleSave = () => {
    const trimmed = editValue.trim()
    if (trimmed) {
      onChange(trimmed)
    }
    setEditing(false)
  }

  const handleCancel = () => {
    setEditValue(value)
    setEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      handleCancel()
    }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          className="h-8 max-w-64 font-heading text-base font-medium"
        />
        <Button size="icon-xs" variant="ghost" onClick={handleSave}>
          <Check />
        </Button>
        <Button size="icon-xs" variant="ghost" onClick={handleCancel}>
          <X />
        </Button>
      </div>
    )
  }

  return (
    <button
      onClick={() => {
        setEditValue(value)
        setEditing(true)
      }}
      className="cursor-text rounded-lg font-heading text-lg font-medium outline-muted transition-colors hover:bg-muted hover:outline-5"
    >
      {value}
    </button>
  )
}
