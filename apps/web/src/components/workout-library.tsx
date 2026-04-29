import { useEffect, useRef } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { toast } from "sonner"
import { ChevronDown, Plus, Upload } from "lucide-react"
import { api } from "#convex/_generated/api"
import { getDefaultIntervals, wattsToPercentage } from "@/lib/workout-utils"
import { parseMrc } from "@/lib/importers"
import { Button } from "@/components/ui/button"
import { ButtonGroup, ButtonGroupSeparator } from "@/components/ui/button-group"
import { WorkoutLibrarySkeleton } from "@/components/workout-library-skeleton"
import { WorkoutLibraryTile } from "@/components/workout-library-tile"
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
  const backfillWorkoutSummaries = useMutation(
    api.workouts.backfillWorkoutSummaries
  )
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestedSummaryBackfillRef = useRef(false)

  const ftp = settings?.ftp ?? 150

  useEffect(() => {
    if (workouts === undefined) return
    if (requestedSummaryBackfillRef.current) return
    if (!workouts.some((workout) => workout.summary === undefined)) return

    requestedSummaryBackfillRef.current = true

    void backfillWorkoutSummaries().catch(() => {
      requestedSummaryBackfillRef.current = false
    })
  }, [backfillWorkoutSummaries, workouts])

  if (workouts === undefined) {
    return <WorkoutLibrarySkeleton />
  }

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
    <div className="flex justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-6">
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
                  render={
                    <Button size="icon" aria-label="More create options" />
                  }
                >
                  <ChevronDown />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => fileInputRef.current?.click()}
                  >
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

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {workouts.map((workout) => {
            return (
              <WorkoutLibraryTile
                key={workout._id}
                workout={workout}
                onClick={() =>
                  navigate({
                    to: "/workout/$id",
                    params: { id: workout._id },
                  })
                }
              />
            )
          })}
        </div>

        {workouts.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No workouts yet. Create your first one to get started!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
