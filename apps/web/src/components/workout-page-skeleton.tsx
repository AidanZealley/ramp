import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function WorkoutPageSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="size-9 rounded-4xl" />
        <Skeleton className="h-10 w-72 max-w-[80vw] rounded-full" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {["w-24", "w-28", "w-20", "w-16"].map((width, index) => (
          <Skeleton key={index} className={`h-5 ${width} rounded-full`} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-44 rounded-4xl" />
        <Skeleton className="h-9 w-24 rounded-4xl" />
        <Skeleton className="h-9 w-24 rounded-4xl" />
      </div>

      <Card className="shadow-none">
        <CardContent className="space-y-4 px-4 py-4 sm:px-6">
          <Skeleton className="h-8 w-40 rounded-4xl" />
          <Skeleton className="h-72 w-full rounded-3xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  )
}
