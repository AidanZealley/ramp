import { createFileRoute } from "@tanstack/react-router"
import type { Id } from "../../../convex/_generated/dataModel"
import { WorkoutPageSkeleton } from "@/components/workout-page-skeleton"
import { WorkoutSummary } from "@/components/workout-summary"
import { WorkoutDeleteDialog } from "./components/workout-delete-dialog"
import { WorkoutNotFound } from "./components/workout-not-found"
import { WorkoutPageControls } from "./components/workout-page-controls"
import { WorkoutPageEditorSection } from "./components/workout-page-editor-section"
import { WorkoutPageHeader } from "./components/workout-page-header"
import { useWorkoutPageController } from "./hooks/use-workout-page-controller"

export const Route = createFileRoute("/workout/$id")({
  component: WorkoutPage,
})

function WorkoutPage() {
  const { id } = Route.useParams()
  const controller = useWorkoutPageController(id as Id<"workouts">)

  if (controller.status === "loading") {
    return <WorkoutPageSkeleton />
  }

  if (controller.status === "notFound") {
    return <WorkoutNotFound onBack={controller.goBack} />
  }

  const { workingCopy, stats, ftp, displayMode, isDirty, actions, editorBridge } =
    controller

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <WorkoutPageHeader
        workoutId={id as Id<"workouts">}
        title={workingCopy.title}
        onBack={actions.goBack}
      />

      <WorkoutPageControls
        displayMode={displayMode}
        onDisplayModeChange={actions.changeDisplayMode}
        onAddInterval={editorBridge.addInterval}
        onExport={actions.exportMrc}
        canExport={workingCopy.intervals.length > 0}
        isDirty={isDirty}
        onRevert={actions.revert}
        onSave={actions.save}
        onDelete={actions.requestDelete}
      />

      <WorkoutPageEditorSection
        intervals={workingCopy.intervals}
        displayMode={displayMode}
        ftp={ftp}
        onIntervalsChange={actions.changeIntervals}
        onRegisterInsertAction={editorBridge.registerInsertAction}
        onEmptyStateAddInterval={actions.appendIntervalFallback}
      />

      {workingCopy.intervals.length > 0 && <WorkoutSummary stats={stats} />}

      <WorkoutDeleteDialog
        open={controller.showDeleteDialog}
        onOpenChange={controller.setShowDeleteDialog}
        title={workingCopy.title}
        onConfirmDelete={actions.deleteWorkout}
      />
    </div>
  )
}
