import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import { WorkoutMini } from "@/components/workout-mini"
import {
  formatDuration,
  formatPower,
  getTotalDuration,
  getAveragePower,
  getDefaultIntervals,
} from "@/lib/workout-utils"
import { Card, CardContent } from "@/components/ui/card"
import { Plus } from "lucide-react"

export const Route = createFileRoute("/")({ component: HomePage })

function HomePage() {
  const workouts = useQuery(api.workouts.list)
  const settings = useQuery(api.settings.get)
  const createWorkout = useMutation(api.workouts.create)
  const navigate = useNavigate()

  const ftp = settings?.ftp ?? 150

  const handleCreate = async () => {
    const id = await createWorkout({
      title: "New Workout",
      powerMode: "absolute",
      intervals: getDefaultIntervals(),
    })
    navigate({ to: "/workout/$id", params: { id } })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          My Workouts
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Click a workout to edit, or create a new one.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {workouts?.map((workout) => {
          const totalDuration = getTotalDuration(workout.intervals)
          const avgPower = getAveragePower(workout.intervals)

          return (
            <Card
              key={workout._id}
              size="sm"
              className="group cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20"
              onClick={() =>
                navigate({
                  to: "/workout/$id",
                  params: { id: workout._id },
                })
              }
            >
              <CardContent className="space-y-3">
                <WorkoutMini
                  intervals={workout.intervals}
                  ftp={ftp}
                  powerMode={workout.powerMode}
                  className="h-16"
                />
                <div>
                  <h3 className="font-heading text-sm leading-tight font-medium">
                    {workout.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDuration(totalDuration)}</span>
                    <span className="text-border">•</span>
                    <span>Avg {formatPower(avgPower, workout.powerMode)}</span>
                    <span className="text-border">•</span>
                    <span>
                      {workout.intervals.length} interval
                      {workout.intervals.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {/* Create new workout tile */}
        <Card
          size="sm"
          className="cursor-pointer border-dashed transition-all hover:border-primary/40 hover:shadow-lg"
          onClick={handleCreate}
        >
          <CardContent className="flex h-full min-h-[120px] flex-col items-center justify-center gap-2 text-muted-foreground">
            <Plus className="size-6" />
            <span className="text-sm font-medium">New Workout</span>
          </CardContent>
        </Card>
      </div>

      {workouts && workouts.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
          <p className="text-muted-foreground">
            No workouts yet. Create your first one to get started!
          </p>
        </div>
      )}
    </div>
  )
}
