import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function WorkoutLibrarySkeleton() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-8 w-36 rounded-full" />
          <Skeleton className="h-4 w-56 max-w-[70vw] rounded-full" />
        </div>

        <Skeleton className="h-9 w-32 rounded-4xl" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <Card key={index} size="sm" className="shadow-none">
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full rounded-3xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-2/3 rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
