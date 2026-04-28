import { useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { ChevronDown, Plus, Upload } from "lucide-react"
import { api } from "../../convex/_generated/api"
import { WorkoutMini } from "@/components/workout-mini"
import {
  formatDuration,
  formatPower,
  getAveragePower,
  getDefaultIntervals,
  getTotalDuration,
  wattsToPercentage,
} from "@/lib/workout-utils"
import { parseMrc } from "@/lib/importers"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function WorkoutLibrary() {
  const workouts = useQuery(api.workouts.list)
  const settings = useQuery(api.settings.get)
  const createWorkout = useMutation(api.workouts.create)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const ftp = settings?.ftp ?? 150
  const displayMode = settings?.powerDisplayMode ?? "percentage"

  const handleCreate = async () => {
    const id = await createWorkout({
      title: "New Workout",
      intervals: getDefaultIntervals(),
    })
    navigate({ to: "/workout/$id", params: { id } })
  }

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return

    const text = await file.text()
    const result = parseMrc(text)
    if (result.kind === "error") {
      toast.error(`Couldn't import ${file.name}: ${result.message}`)
      return
    }

    const filenameTitle = file.name.replace(/\.mrc$/i, "")
    const intervals =
      result.workout.powerMode === "percentage"
        ? result.workout.intervals
        : result.workout.intervals.map((interval) => ({
            ...interval,
            startPower: wattsToPercentage(interval.startPower, ftp),
            endPower: wattsToPercentage(interval.endPower, ftp),
          }))

    const id = await createWorkout({
      title: result.workout.title || filenameTitle,
      intervals,
    })
    navigate({ to: "/workout/$id", params: { id } })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            My Workouts
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Click a workout to edit, or create a new one.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div />
          <ButtonGroup>
            <Button onClick={handleCreate}>
              <Plus />
              New Workout
            </Button>

            <ButtonGroupSeparator />

            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button size="icon" aria-label="More create options" />}
              >
                <ChevronDown />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <Upload />
                  Upload workout (.mrc)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </ButtonGroup>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mrc,text/plain"
            className="hidden"
            aria-hidden="true"
            onChange={handleUploadFile}
          />
        </div>
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
                  displayMode={displayMode}
                  className="h-16"
                />
                <div>
                  <h3 className="font-heading text-sm leading-tight font-medium">
                    {workout.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{formatDuration(totalDuration)}</span>
                    <span className="text-border">•</span>
                    <span>Avg {formatPower(avgPower, displayMode, ftp)}</span>
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
