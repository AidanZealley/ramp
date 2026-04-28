import { useState, useCallback, useRef } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useQuery, useMutation } from "convex/react"
import { api } from "../../../convex/_generated/api"
import type { Id } from "../../../convex/_generated/dataModel"
import {
  WorkoutEditor,
  type WorkoutEditorHandle,
} from "@/components/workout-editor"
import { WorkoutSummary } from "@/components/workout-summary"
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
import { DEFAULT_FTP, getWorkoutStats } from "@/lib/workout-utils"
import type { Interval } from "@/lib/workout-utils"
import { downloadTextFile, workoutToMrc } from "@/lib/exporters"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { WorkoutPageSkeleton } from "@/components/workout-page-skeleton"
import {
  ArrowLeft,
  Download,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react"

export const Route = createFileRoute("/workout/$id")({
  component: WorkoutPage,
})

interface WorkoutEdits {
  title: string
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
  const upsertSettings = useMutation(api.settings.upsert)

  const ftp = settings?.ftp ?? DEFAULT_FTP
  const displayMode = settings?.powerDisplayMode ?? "percentage"

  const editorRef = useRef<WorkoutEditorHandle>(null)

  const [edits, setEdits] = useState<WorkoutEdits | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Working copy: edits or original data
  const workingCopy: WorkoutEdits | null =
    edits ??
    (workout
      ? {
          title: workout.title,
          intervals: workout.intervals.map((i) => ({ ...i })),
        }
      : null)

  const isDirty = edits !== null

  const applyEdit = useCallback(
    (updates: Partial<WorkoutEdits>) => {
      setEdits((prev) => {
        const base = prev ?? {
          title: workout!.title,
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
    applyEdit({
      intervals: [
        ...workingCopy.intervals,
        {
          startPower: 75,
          endPower: 75,
          durationSeconds: 300,
        },
      ],
    })
  }, [workingCopy, applyEdit])

  const handleExportMrc = useCallback(() => {
    if (!workingCopy || workingCopy.intervals.length === 0) return
    const content = workoutToMrc({
      title: workingCopy.title,
      intervals: workingCopy.intervals,
    })
    downloadTextFile(content, `${workingCopy.title}.mrc`, "text/plain")
  }, [workingCopy])

  const handleDisplayModeChange = useCallback(
    async (value: "absolute" | "percentage") => {
      if (value === displayMode) return
      await upsertSettings({ powerDisplayMode: value })
    },
    [displayMode, upsertSettings]
  )

  const handleSave = async () => {
    if (!edits || !workout) return
    await updateWorkout({
      id: workout._id,
      title: edits.title,
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
    return <WorkoutPageSkeleton />
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

  const stats = getWorkoutStats(workingCopy.intervals)

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate({ to: "/" })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <EditableTitle
            value={workingCopy.title}
            onChange={handleTitleChange}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          variant="outline"
          value={[displayMode]}
          onValueChange={(values) =>
            handleDisplayModeChange(values[0] as "absolute" | "percentage")
          }
        >
          <ToggleGroupItem value="absolute">Watts</ToggleGroupItem>
          <ToggleGroupItem value="percentage">% FTP</ToggleGroupItem>
        </ToggleGroup>

        <div className="mx-1 h-5 w-px bg-border" />

        <Button
          variant="outline"
          onClick={handleAddInterval}
          data-editor-action
        >
          <Plus className="size-4" />
          Add Interval
        </Button>

        <Button
          variant="outline"
          onClick={handleExportMrc}
          disabled={workingCopy.intervals.length === 0}
        >
          <Download className="size-4" />
          Export .mrc
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

        <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>

      {/* Editor */}
      {workingCopy.intervals.length > 0 ? (
        <WorkoutEditor
          ref={editorRef}
          intervals={workingCopy.intervals}
          displayMode={displayMode}
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
      {workingCopy.intervals.length > 0 && <WorkoutSummary stats={stats} />}

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
