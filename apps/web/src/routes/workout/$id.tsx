import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { useWorkoutPageController } from "../../hooks/workout/use-workout-page-controller"
import { WorkoutEditorSessionProvider } from "./components/workout-editor-session-provider"
import { WorkoutEditorSummary } from "./components/workout-editor-summary"
import { WorkoutNotFound } from "./components/workout-not-found"
import { WorkoutPageControls } from "./components/workout-page-controls"
import { WorkoutPageEditorSection } from "./components/workout-page-editor-section"
import { WorkoutPageHeader } from "./components/workout-page-header"
import { WorkoutSaveConflictDialog } from "./components/workout-save-conflict-dialog"
import type { Interval } from "@/lib/workout-utils"
import type { Id } from "#convex/_generated/dataModel"
import { WorkoutPageSkeleton } from "@/components/workout-page-skeleton"
import {
  useWorkoutEditorActions,
  useWorkoutEditorBaselineRevision,
  useWorkoutEditorCurrentIntervals,
  useWorkoutEditorPendingServerSnapshot,
} from "@/components/workout-editor/store"

export const Route = createFileRoute("/workout/$id")({
  params: {
    parse: (params) => ({ id: params.id as Id<"workouts"> }),
    stringify: (params) => ({ id: params.id }),
  },
  component: WorkoutPage,
})

function WorkoutPage() {
  const { id } = Route.useParams()
  const controller = useWorkoutPageController(id)

  if (controller.status === "loading") {
    return <WorkoutPageSkeleton />
  }

  if (controller.status === "notFound") {
    return <WorkoutNotFound onBack={controller.goBack} />
  }

  const { workout, ftp, displayMode, actions } = controller
  const resetKey = `${workout._id}:${workout.intervalsRevision}`

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <WorkoutPageHeader
        workoutId={id}
        title={workout.title}
        onBack={actions.goBack}
        onDuplicate={actions.duplicateWorkout}
        onDelete={actions.deleteWorkout}
      />

      <WorkoutEditorSessionProvider
        serverIntervals={workout.intervals}
        serverResetKey={resetKey}
        serverIntervalsRevision={workout.intervalsRevision}
        displayMode={displayMode}
        ftp={ftp}
      >
        <WorkoutPageSessionContent
          displayMode={displayMode}
          onDisplayModeChange={actions.changeDisplayMode}
          onSaveIntervals={actions.saveIntervals}
          onExport={actions.exportIntervals}
        />
      </WorkoutEditorSessionProvider>
    </div>
  )
}

function WorkoutPageSessionContent({
  displayMode,
  onDisplayModeChange,
  onSaveIntervals,
  onExport,
}: {
  displayMode: "absolute" | "percentage"
  onDisplayModeChange: (mode: "absolute" | "percentage") => void | Promise<void>
  onSaveIntervals: (args: {
    intervals: Array<Interval>
    expectedIntervalsRevision: number
    force?: boolean
  }) => Promise<"saved" | "conflict">
  onExport: (intervals: Array<Interval>) => void
}) {
  const [showSaveConflictDialog, setShowSaveConflictDialog] = useState(false)
  const intervals = useWorkoutEditorCurrentIntervals()
  const baselineRevision = useWorkoutEditorBaselineRevision()
  const pendingServerSnapshot = useWorkoutEditorPendingServerSnapshot()
  const editorActions = useWorkoutEditorActions()

  const handleSave = async ({
    intervals: nextIntervals,
    expectedIntervalsRevision,
    hasIncomingServerChanges: hasIncomingChanges,
  }: {
    intervals: Array<Interval>
    expectedIntervalsRevision: number
    hasIncomingServerChanges: boolean
  }) => {
    if (hasIncomingChanges) {
      setShowSaveConflictDialog(true)
      return
    }

    const status = await onSaveIntervals({
      intervals: nextIntervals,
      expectedIntervalsRevision,
      force: false,
    })

    if (status === "conflict") {
      setShowSaveConflictDialog(true)
    }
  }

  const handleOverwrite = async () => {
    await onSaveIntervals({
      intervals,
      expectedIntervalsRevision: baselineRevision,
      force: true,
    })
    setShowSaveConflictDialog(false)
  }

  const handleGetLatest = () => {
    editorActions.adoptPendingServerSnapshot()
    setShowSaveConflictDialog(false)
  }

  return (
    <>
      <WorkoutPageControls
        displayMode={displayMode}
        onDisplayModeChange={onDisplayModeChange}
        onExport={onExport}
        onSave={handleSave}
      />

      <WorkoutPageEditorSection />
      <WorkoutEditorSummary />

      <WorkoutSaveConflictDialog
        open={showSaveConflictDialog}
        onOpenChange={setShowSaveConflictDialog}
        onOverwrite={handleOverwrite}
        onGetLatest={handleGetLatest}
        canGetLatest={pendingServerSnapshot !== null}
      />
    </>
  )
}
