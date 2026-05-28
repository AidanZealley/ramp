import { createFileRoute, Link } from "@tanstack/react-router"
import { useMutation, usePaginatedQuery, useQuery } from "convex/react"
import { ArrowRight, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "#convex/_generated/api"
import { ActivityCard } from "@/components/activity/activity-card"
import { getActivityResumeUrl } from "@/components/activity/routing"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

export const Route = createFileRoute("/activity/")({
  component: ActivityIndexPage,
})

function ActivityIndexPage() {
  const unresolvedActivity = useQuery(api.activities.getUnresolved)
  const completed = usePaginatedQuery(
    api.activities.listCompleted,
    {},
    { initialNumItems: 20 }
  )
  const discardActivity = useMutation(api.activities.discard)

  const handleDiscard = async (activityId: string) => {
    await discardActivity({ activityId: activityId as never })
    toast.success("Activity discarded")
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Activities
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Saved rides and activities waiting for review.
        </p>
      </div>

      {unresolvedActivity === undefined ? (
        <Skeleton className="h-32 rounded-lg" />
      ) : unresolvedActivity ? (
        <section className="grid gap-3" aria-label="Open activity">
          <h2 className="font-heading text-lg font-semibold">
            {unresolvedActivity.status === "pending"
              ? "Pending review"
              : "Continue activity"}
          </h2>
          <ActivityCard
            activity={unresolvedActivity}
            actions={
              <div className="flex gap-2">
                <Button
                  nativeButton={false}
                  size="sm"
                  render={
                    <Link {...getActivityResumeUrl(unresolvedActivity)} />
                  }
                >
                  <ArrowRight />
                  {unresolvedActivity.status === "pending"
                    ? "Review"
                    : "Resume"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void handleDiscard(unresolvedActivity._id)}
                >
                  <Trash2 />
                  Discard
                </Button>
              </div>
            }
          />
        </section>
      ) : null}

      <section className="grid gap-3" aria-label="Completed activity history">
        <h2 className="font-heading text-lg font-semibold">History</h2>
        {completed.status === "LoadingFirstPage" ? (
          <div className="grid gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : completed.results.length > 0 ? (
          <>
            <div className="grid gap-3">
              {completed.results.map((activity) => (
                <ActivityCard key={activity._id} activity={activity} />
              ))}
            </div>
            {completed.status === "CanLoadMore" ||
            completed.status === "LoadingMore" ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => completed.loadMore(20)}
                disabled={completed.status === "LoadingMore"}
              >
                {completed.status === "LoadingMore" ? "Loading" : "Load more"}
              </Button>
            ) : null}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border/60 px-6 py-12 text-center">
            <p className="text-muted-foreground">
              Saved rides will appear here after you complete an activity.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
