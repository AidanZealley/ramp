import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DrawerSearchProps {
  value: string
  onChange: (value: string) => void
}

export function DrawerSearch({ value, onChange }: DrawerSearchProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search workouts"
        className="pl-9"
      />
    </div>
  )
}
