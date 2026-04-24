import { useState, useCallback, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../convex/_generated/api"
import type { Id } from "../../convex/_generated/dataModel"
import { WorkoutEditor, type WorkoutEditorHandle } from "@/components/workout-editor"
import { EditableTitle } from "@/components/editable-title"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  formatDuration,
  formatPower,
  getTotalDuration,
  getAveragePower,
} from "@/lib/workout-utils"
import type { Interval } from "@/lib/workout-utils"
import { ArrowLeft, Plus, RefreshCw, Save, Trash2 } from "lucide-react"

export const Route = createFileRoute("/workout/$id")({
  component: WorkoutPage,
})

interface WorkoutEdits {
  title: string
  powerMode: "absolute" | "percentage"
  intervals: Interval[]
}

function WorkoutPage() {
  const { id } = Route.useParams()
  const navigate = useNavigate()
  const workout = useQuery(api.workouts.get, {
    id: id as Id<"workouts">,
  })
  const settings = useQuery(api.settings.get)
  const updateWorkout = useMutation(api.workouts.update)
  const removeWorkout = useMutation(api.workouts.remove)

  const ftp = settings?.ftp ?? 150

  const editorRef = useRef<WorkoutEditorHandle>(null)

  const [edits, setEdits] = useState<WorkoutEdits | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Working copy: edits or original data
  const workingCopy: WorkoutEdits | null =
    edits ??
    (workout
      ? {
          title: workout.title,
          powerMode: workout.powerMode,
          intervals: workout.intervals.map((i) => ({ ...i })),
        }
      : null)

  const isDirty = edits !== null

  const applyEdit = useCallback(
    (updates: Partial<WorkoutEdits>) => {
      setEdits((prev) => {
        const base = prev ?? {
          title: workout!.title,
          powerMode: workout!.powerMode,
          intervals: workout!.intervals.map((i) => ({ ...i })),
        }
        return { ...base, ...updates }
      })
    },
    [workout]
  )

  const handleIntervalsChange = useCallback(
    (intervals: Interval[]) => {
      applyEdit({ intervals })
    },
    [applyEdit]
  )

  const handleTitleChange = useCallback(
    (title: string) => {
      applyEdit({ title })
    },
    [applyEdit]
  )

  const handlePowerModeToggle = useCallback(() => {
    if (!workingCopy || !workout) return

    const currentMode = workingCopy.powerMode
    const newMode = currentMode === "absolute" ? "percentage" : "absolute"

    // Convert power values
    const convertedIntervals = workingCopy.intervals.map((interval) => {
      if (currentMode === "absolute" && newMode === "percentage") {
        return {
          ...interval,
          startPower: Math.round((interval.startPower / ftp) * 100),
          endPower: Math.round((interval.endPower / ftp) * 100),
        }
      } else {
        return {
          ...interval,
          startPower: Math.round((interval.startPower / 100) * ftp),
          endPower: Math.round((interval.endPower / 100) * ftp),
        }
      }
    })

    applyEdit({ powerMode: newMode, intervals: convertedIntervals })
  }, [workingCopy, workout, ftp, applyEdit])

  const handleAddInterval = useCallback(() => {
    if (editorRef.current) {
      // Editor is mounted — delegate fully so it can insert after the
      // currently-selected interval, auto-select the new one, and scroll
      // to it correctly.
      editorRef.current.insertInterval()
      return
    }

    // Fallback: editor isn't mounted yet (empty-state button). Just append.
    if (!workingCopy) return
    const defaultPower = workingCopy.powerMode === "absolute" ? 150 : 75
    applyEdit({
      intervals: [
        ...workingCopy.intervals,
        { startPower: defaultPower, endPower: defaultPower, durationSeconds: 300 },
      ],
    })
  }, [workingCopy, applyEdit])

  const handleSave = async () => {
    if (!edits || !workout) return
    await updateWorkout({
      id: workout._id,
      title: edits.title,
      powerMode: edits.powerMode,
      intervals: edits.intervals,
    })
    setEdits(null)
  }

  const handleRevert = () => {
    setEdits(null)
  }

  const handleDelete = async () => {
    if (!workout) return
    await removeWorkout({ id: workout._id })
    navigate({ to: "/" })
  }

  // Loading state
  if (workout === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    )
  }

  // Not found
  if (workout === null) {
    return (
      <div className="space-y-4 py-20 text-center">
        <h2 className="font-heading text-xl font-medium">Workout not found</h2>
        <p className="text-sm text-muted-foreground">
          This workout may have been deleted.
        </p>
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          <ArrowLeft className="size-4" />
          Back to Workouts
        </Button>
      </div>
    )
  }

  if (!workingCopy) return null

  const totalDuration = getTotalDuration(workingCopy.intervals)
  const avgPower = getAveragePower(workingCopy.intervals)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <EditableTitle value={workingCopy.title} onChange={handleTitleChange} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={workingCopy.powerMode === "absolute" ? "default" : "outline"}
          size="sm"
          onClick={
            workingCopy.powerMode === "percentage"
              ? handlePowerModeToggle
              : undefined
          }
        >
          Watts
        </Button>
        <Button
          variant={
            workingCopy.powerMode === "percentage" ? "default" : "outline"
          }
          size="sm"
          onClick={
            workingCopy.powerMode === "absolute"
              ? handlePowerModeToggle
              : undefined
          }
        >
          % FTP
        </Button>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button variant="outline" size="sm" onClick={handleAddInterval}>
          <Plus className="size-4" />
          Add Interval
        </Button>

        <div className="flex-1" />

        {isDirty && (
          <>
            <Button variant="outline" size="sm" onClick={handleRevert}>
              <RefreshCw className="size-4" />
              Revert
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="size-4" />
              Save Changes
            </Button>
          </>
        )}

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>

      {/* Editor */}
      {workingCopy.intervals.length > 0 ? (
        <WorkoutEditor
          ref={editorRef}
          intervals={workingCopy.intervals}
          powerMode={workingCopy.powerMode}
          ftp={ftp}
          onIntervalsChange={handleIntervalsChange}
        />
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border/60 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No intervals yet. Add one to get started.
          </p>
          <Button variant="outline" size="sm" onClick={handleAddInterval}>
            <Plus className="size-4" />
            Add Interval
          </Button>
        </div>
      )}

      {/* Stats */}
      {workingCopy.intervals.length > 0 && (
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <div>
            <span className="font-medium text-foreground">
              {formatDuration(totalDuration)}
            </span>{" "}
            total
          </div>
          <div>
            <span className="font-medium text-foreground">
              {formatPower(avgPower, workingCopy.powerMode)}
            </span>{" "}
            avg power
          </div>
          <div>
            <span className="font-medium text-foreground">
              {workingCopy.intervals.length}
            </span>{" "}
            interval{workingCopy.intervals.length !== 1 ? "s" : ""}
          </div>
          <div>
            <span className="font-medium text-foreground">{ftp}W</span> FTP
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workout</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;
              {workingCopy.title}&rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
