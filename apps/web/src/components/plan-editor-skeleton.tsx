import { WEEKDAYS } from "@/components/plan-editor/constants"
import { Skeleton } from "@/components/ui/skeleton"

export function PlanEditorSkeleton() {
  return (
    <div className="space-y-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-3">
        <Skeleton className="size-9 rounded-4xl" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <Skeleton className="h-10 w-72 max-w-[80vw] rounded-full" />
          <Skeleton className="h-8 w-8 rounded-4xl" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40 rounded-full" />
          <Skeleton className="h-8 w-28 rounded-4xl" />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {WEEKDAYS.map((day) => (
            <Skeleton key={day} className="min-h-44 w-full rounded-xl" />
          ))}
        </div>

        <Skeleton className="h-28 w-full rounded-xl" />
      </div>
    </div>
  )
}
