import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function PlanLibrarySkeleton() {
  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-8 w-40 rounded-full" />
            <Skeleton className="h-4 w-60 max-w-[70vw] rounded-full" />
          </div>

          <Skeleton className="h-9 w-28 rounded-4xl" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <Card key={index} size="sm" className="shadow-none">
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-2/3 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-28 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
