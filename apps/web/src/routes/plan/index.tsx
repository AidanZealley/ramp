import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useMutation, useQuery } from "convex/react"
import { useState } from "react"
import { toast } from "sonner"
import { Copy, MoreHorizontal, Plus, Trash2 } from "lucide-react"
import { api } from "#convex/_generated/api"
import type { Id } from "#convex/_generated/dataModel"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDuration } from "@/lib/workout-utils"
import { PlanLibrarySkeleton } from "@/components/plan-library-skeleton"

export const Route = createFileRoute("/plan/")({
  component: PlansPage,
})

function PlansPage() {
  const plans = useQuery(api.plans.list)
  const createPlan = useMutation(api.plans.create)
  const duplicatePlan = useMutation(api.plans.duplicatePlan)
  const removePlan = useMutation(api.plans.remove)
  const navigate = useNavigate()
  const [deletingPlanId, setDeletingPlanId] = useState<Id<"plans"> | null>(null)

  if (plans === undefined) {
    return <PlanLibrarySkeleton />
  }

  const handleCreate = async () => {
    const planId = await createPlan({ title: "New Plan" })
    navigate({ to: "/plan/$id", params: { id: planId } })
  }

  const handleDuplicate = async (planId: Id<"plans">) => {
    const newPlanId = await duplicatePlan({ planId })
    toast.success("Plan duplicated")
    navigate({ to: "/plan/$id", params: { id: newPlanId } })
  }

  const handleDelete = async () => {
    if (!deletingPlanId) return
    await removePlan({ planId: deletingPlanId })
    toast.success("Plan deleted")
    setDeletingPlanId(null)
  }

  const deletingPlan = plans.find((plan) => plan._id === deletingPlanId) ?? null

  return (
    <div className="flex justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Training Plans
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize workouts into multi-week blocks and progression arcs.
            </p>
          </div>

          <Button onClick={() => void handleCreate()}>
            <Plus className="size-4" />
            New Plan
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan._id}
              size="sm"
              className="cursor-pointer transition-all hover:shadow-lg hover:ring-2 hover:ring-primary/20"
              onClick={() =>
                navigate({ to: "/plan/$id", params: { id: plan._id } })
              }
            >
              <CardHeader>
                <CardTitle>{plan.title}</CardTitle>
                <CardDescription>
                  {plan.weekCount} week{plan.weekCount === 1 ? "" : "s"}
                </CardDescription>
                <CardAction>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Actions for ${plan.title}`}
                          onClick={(event) => event.stopPropagation()}
                        />
                      }
                    >
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleDuplicate(plan._id)
                        }}
                      >
                        <Copy className="size-4" />
                        Duplicate plan
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(event) => {
                          event.stopPropagation()
                          setDeletingPlanId(plan._id)
                        }}
                      >
                        <Trash2 className="size-4" />
                        Delete plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div>{plan.totalWorkouts} scheduled workouts</div>
                <div>
                  {formatDuration(plan.totalDurationSeconds)} total duration
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/60 px-6 py-12 text-center">
            <p className="text-muted-foreground">
              No training plans yet. Create your first one to get started!
            </p>
          </div>
        )}

        <Dialog
          open={deletingPlanId !== null}
          onOpenChange={(open) => !open && setDeletingPlanId(null)}
        >
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Delete plan?</DialogTitle>
              <DialogDescription>
                {deletingPlan
                  ? `This will permanently remove "${deletingPlan.title}" and all of its week structure.`
                  : "This will permanently remove the selected plan."}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeletingPlanId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => void handleDelete()}>
                Delete plan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
