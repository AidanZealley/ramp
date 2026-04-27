import { ChevronDown, ListFilter, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import type {
  DurationFilter,
  SortOption,
} from "../types"
import { sortLabels } from "../types"

interface DialogWorkoutFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  durationFilter: DurationFilter
  onDurationFilterChange: (value: DurationFilter) => void
  sort: SortOption
  onSortChange: (value: SortOption) => void
}

const durationFilterOptions: Array<[DurationFilter, string]> = [
  ["any", "Any"],
  ["short", "< 30 min"],
  ["medium", "30-60 min"],
  ["long", "> 60 min"],
]

export function DialogWorkoutFilters({
  search,
  onSearchChange,
  durationFilter,
  onDurationFilterChange,
  sort,
  onSortChange,
}: DialogWorkoutFiltersProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search workouts"
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ButtonGroup>
          {durationFilterOptions.map(([value, label]) => (
            <Button
              key={value}
              variant={durationFilter === value ? "default" : "outline"}
              size="sm"
              onClick={() => onDurationFilterChange(value)}
            >
              {label}
            </Button>
          ))}
        </ButtonGroup>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
            <ListFilter className="size-4" />
            Sort: {sortLabels[sort]}
            <ChevronDown className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuRadioGroup
              value={sort}
              onValueChange={(value) => onSortChange(value as SortOption)}
            >
              {(Object.entries(sortLabels) as Array<[SortOption, string]>).map(
                ([value, label]) => (
                  <DropdownMenuRadioItem key={value} value={value}>
                    {label}
                  </DropdownMenuRadioItem>
                )
              )}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
