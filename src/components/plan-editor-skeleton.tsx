import { WEEKDAYS } from "@/components/plan-editor/constants"
import { Skeleton } from "@/components/ui/skeleton"

function PlanWeekSkeletonRow() {
  return (
    <div className="grid min-w-[62rem] grid-cols-[12rem_repeat(7,minmax(7rem,1fr))] gap-3 border-b border-border/60 py-3 last:border-b-0">
      <div className="space-y-3 rounded-lg bg-muted/25 p-3">
        <Skeleton className="h-7 w-24 rounded-full" />
        <Skeleton className="h-4 w-20 rounded-full" />
        <Skeleton className="h-8 w-full rounded-4xl" />
      </div>

      {WEEKDAYS.map((day) => (
        <div
          key={day}
          className="rounded-lg border border-border/60 bg-card/70 p-3"
        >
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      ))}
    </div>
  )
}

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

      <div className="overflow-x-auto rounded-lg border border-border/60 bg-card/80">
        <div className="min-w-[62rem]">
          <div className="grid grid-cols-[12rem_repeat(7,minmax(7rem,1fr))] gap-3 border-b border-border/60 py-3">
            <div className="px-3">
              <Skeleton className="h-3 w-12 rounded-full" />
            </div>
            {WEEKDAYS.map((day) => (
              <div key={day} className="px-2">
                <Skeleton className="h-3 w-12 rounded-full" />
              </div>
            ))}
          </div>

          <div className="px-3">
            {Array.from({ length: 3 }, (_, index) => (
              <PlanWeekSkeletonRow key={index} />
            ))}
          </div>
        </div>
      </div>

      <Skeleton className="h-9 w-full rounded-4xl" />
    </div>
  )
}
