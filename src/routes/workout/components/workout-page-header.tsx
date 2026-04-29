import { ArrowLeft } from "lucide-react"
import { EditableTitle } from "@/components/editable-title"
import { Button } from "@/components/ui/button"

interface WorkoutPageHeaderProps {
  title: string
  onBack: () => void
  onTitleChange: (title: string) => void
}

export function WorkoutPageHeader({
  title,
  onBack,
  onTitleChange,
}: WorkoutPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      <Button variant="ghost" size="icon" onClick={onBack}>
        <ArrowLeft className="size-4" />
      </Button>
      <div>
        <EditableTitle value={title} onChange={onTitleChange} />
      </div>
    </div>
  )
}
