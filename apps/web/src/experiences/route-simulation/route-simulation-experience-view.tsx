import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useMutation } from "convex/react"
import { Capability } from "@ramp/ride-core"
import { useRideSelector } from "@ramp/ride-react"
import { RouteSimulationLiveView } from "./components/route-simulation-live-view"
import { RouteSimulationSetup } from "./components/route-simulation-setup"
import { useRouteSimulationRide } from "./hooks/use-route-simulation-ride"
import { useRouteSimulationRoute } from "./hooks/use-route-simulation-route"
import { useRouteSimulationPreferences } from "./hooks/use-route-simulation-preferences"
import type { RouteProgressMode } from "./types"
import type { Id } from "#convex/_generated/dataModel"
import type {
  ActivityClientDoc,
  ActivityExperienceAPI,
} from "@/components/activity/types"
import type { RideExperienceConnection } from "@/ride/experience-runtime"
import type { ExperienceSessionAPI } from "@/ride/experience-session"
import { api } from "#convex/_generated/api"
import { formatActivityDuration } from "@/components/activity/format"
import { SaveActivityDialog } from "@/components/activity/save-activity-dialog"
import { UnresolvedActivityDialog } from "@/components/activity/unresolved-activity-dialog"
import { useUnitFormatters } from "@/hooks/use-unit-formatters"

type RouteSimulationExperienceViewProps = {
  activity?: ActivityExperienceAPI
  connection?: RideExperienceConnection
  search?: {
    activityId?: string
    routeId?: string
    routeSegmentId?: string
  }
  session: ExperienceSessionAPI
}

export function RouteSimulationExperienceView({
  activity,
  connection,
  search,
  session,
}: RouteSimulationExperienceViewProps) {
  const navigate = useNavigate({ from: "/ride/$experienceId" })
  const linkedRouteId = search?.routeId as Id<"routes"> | undefined
  const linkedRouteSegmentId = search?.routeSegmentId as
    | Id<"routeSegments">
    | undefined
  const linkedActivityId = search?.activityId
  const completeActivity = useMutation(api.activities.complete)
  const discardActivity = useMutation(api.activities.discard)
  const markPendingActivity = useMutation(api.activities.markPending)
  const [blockedActivity, setBlockedActivity] =
    useState<ActivityClientDoc | null>(null)
  const [reviewActivity, setReviewActivity] =
    useState<ActivityClientDoc | null>(null)
  const units = useUnitFormatters()
  const [retryAfterResolve, setRetryAfterResolve] = useState(false)
  const [activityDialogBusy, setActivityDialogBusy] = useState(false)
  const loadedActivityId = useRef<string | null>(null)
  const trainerConnected = useRideSelector(session, (s) => s.trainerConnected)
  const supportsSimulation = session.controls
    .getCapabilities()
    .has(Capability.SimulationGrade)

  const route = useRouteSimulationRoute({
    linkedRouteId,
    linkedRouteSegmentId,
    navigate,
  })
  const preferences = useRouteSimulationPreferences()
  const ride = useRouteSimulationRide({
    parsedRoute: route.parsedRoute,
    physicsConfig: preferences.physicsConfig,
    progressMode: preferences.progressMode,
    session,
    supportsSimulation,
    trainerConnected,
  })

  const handleSelectRoute = useCallback(
    (routeId: Id<"routes">) => {
      ride.resetRideStateForRouteChange()
      route.handleSelectRoute(routeId)
    },
    [ride, route]
  )

  const handleChangeRoute = useCallback(() => {
    ride.resetRideStateForRouteChange()
    route.handleChangeRoute()
  }, [ride, route])

  const handleProgressModeChange = useCallback(
    (mode: RouteProgressMode) => {
      ride.resetSeekTransition()
      preferences.handleProgressModeChange(mode)
    },
    [ride, preferences]
  )

  useEffect(() => {
    const resumeActivity = activity?.resumeActivity
    if (!resumeActivity || !linkedActivityId) return
    if (loadedActivityId.current === resumeActivity._id) return
    if (resumeActivity.sourceSnapshot.kind !== "route") return

    if (resumeActivity.status === "pending") {
      loadedActivityId.current = resumeActivity._id
      setReviewActivity(resumeActivity)
      return
    }

    if (resumeActivity.status !== "in_progress") return
    if (resumeActivity.resumeState.kind !== "route") return
    if (!route.parsedRoute) return

    loadedActivityId.current = resumeActivity._id
    preferences.handleProgressModeChange(
      resumeActivity.resumeState.progressMode
    )
    ride.setSmoothingLevel(resumeActivity.resumeState.smoothingLevel)
    void ride.handleResumeActivity({
      distanceMeters: resumeActivity.resumeState.distanceMeters,
      elapsedSeconds: resumeActivity.resumeState.elapsedSeconds,
    })
  }, [
    activity?.resumeActivity,
    linkedActivityId,
    preferences,
    ride,
    route.parsedRoute,
  ])

  const handleStart = useCallback(async () => {
    if (!linkedRouteId) return
    if (!activity) {
      await ride.handleStart()
      return
    }
    const result = await activity.startRouteActivity({ routeId: linkedRouteId })
    if (!result.ok) {
      setBlockedActivity(result.activity)
      return
    }
    void navigate({
      search: (previous) => ({
        ...previous,
        activityId: result.activity._id,
        routeSegmentId: linkedRouteSegmentId,
        routeId:
          result.activity.sourceSnapshot.kind === "route"
            ? result.activity.sourceSnapshot.routeId
            : linkedRouteId,
      }),
      replace: true,
    })
    await ride.handleStart()
  }, [activity, linkedRouteId, linkedRouteSegmentId, navigate, ride])

  const startDisabledReason = !route.parsedRoute
    ? "Choose a valid GPX route."
    : !trainerConnected
      ? "Connect a trainer before starting."
      : !supportsSimulation
        ? "Connected trainer does not support simulation grade."
        : preferences.progressMode === "app-physics" &&
            !preferences.physicsConfig
          ? "Loading physics profile."
          : null

  if (!ride.isActive && !ride.isComplete) {
    return (
      <>
        <UnresolvedActivityDialog
          open={blockedActivity !== null}
          activity={blockedActivity}
          busy={activityDialogBusy}
          onOpenChange={(open) => {
            if (!open) setBlockedActivity(null)
          }}
          onResume={() => {
            if (!blockedActivity || !activity) return
            void navigate(activity.getResumeUrl(blockedActivity))
          }}
          onSaveExisting={async () => {
            if (!blockedActivity) return
            setActivityDialogBusy(true)
            try {
              if (blockedActivity.status === "in_progress") {
                await markPendingActivity({
                  activityId: blockedActivity._id,
                  summary: blockedActivity.summary,
                  resumeState: blockedActivity.resumeState,
                })
              }
              setReviewActivity({ ...blockedActivity, status: "pending" })
              setRetryAfterResolve(true)
              setBlockedActivity(null)
            } finally {
              setActivityDialogBusy(false)
            }
          }}
          onDiscardExisting={async () => {
            if (!blockedActivity) return
            setActivityDialogBusy(true)
            try {
              await discardActivity({ activityId: blockedActivity._id })
              setBlockedActivity(null)
              void handleStart()
            } finally {
              setActivityDialogBusy(false)
            }
          }}
        />
        <SaveActivityDialog
          open={reviewActivity !== null}
          defaultTitle={reviewActivity?.title ?? ""}
          metrics={
            reviewActivity
              ? [
                  {
                    label: "Time",
                    value: formatActivityDuration(
                      reviewActivity.summary.durationSeconds
                    ),
                  },
                  {
                    label: "Distance",
                    value: units.distance(reviewActivity.summary.distanceMeters),
                  },
                ]
              : []
          }
          saving={activityDialogBusy}
          discarding={activityDialogBusy}
          onOpenChange={(open) => {
            if (!open) setReviewActivity(null)
          }}
          onSave={async (title) => {
            if (!reviewActivity) return
            setActivityDialogBusy(true)
            try {
              await completeActivity({
                activityId: reviewActivity._id,
                title,
              })
              setReviewActivity(null)
              if (retryAfterResolve) {
                setRetryAfterResolve(false)
                void handleStart()
              }
            } finally {
              setActivityDialogBusy(false)
            }
          }}
          onDiscard={async () => {
            if (!reviewActivity) return
            setActivityDialogBusy(true)
            try {
              await discardActivity({ activityId: reviewActivity._id })
              setReviewActivity(null)
              if (retryAfterResolve) {
                setRetryAfterResolve(false)
                void handleStart()
              }
            } finally {
              setActivityDialogBusy(false)
            }
          }}
        />
        <RouteSimulationSetup
          onChangeRoute={handleChangeRoute}
          onProgressModeChange={handleProgressModeChange}
          onSelectRoute={handleSelectRoute}
          onStart={handleStart}
          route={route}
          preferences={preferences}
          startDisabledReason={startDisabledReason}
        />
      </>
    )
  }

  return route.parsedRoute ? (
    <>
      <UnresolvedActivityDialog
        open={blockedActivity !== null}
        activity={blockedActivity}
        busy={activityDialogBusy}
        onOpenChange={(open) => {
          if (!open) setBlockedActivity(null)
        }}
        onResume={() => {
          if (!blockedActivity || !activity) return
          void navigate(activity.getResumeUrl(blockedActivity))
        }}
        onSaveExisting={async () => {
          if (!blockedActivity) return
          setActivityDialogBusy(true)
          try {
            if (blockedActivity.status === "in_progress") {
              await markPendingActivity({
                activityId: blockedActivity._id,
                summary: blockedActivity.summary,
                resumeState: blockedActivity.resumeState,
              })
            }
            setReviewActivity({ ...blockedActivity, status: "pending" })
            setRetryAfterResolve(true)
            setBlockedActivity(null)
          } finally {
            setActivityDialogBusy(false)
          }
        }}
        onDiscardExisting={async () => {
          if (!blockedActivity) return
          setActivityDialogBusy(true)
          try {
            await discardActivity({ activityId: blockedActivity._id })
            setBlockedActivity(null)
            void handleStart()
          } finally {
            setActivityDialogBusy(false)
          }
        }}
      />
      <SaveActivityDialog
        open={reviewActivity !== null}
        defaultTitle={reviewActivity?.title ?? ""}
        metrics={
          reviewActivity
            ? [
                {
                  label: "Time",
                  value: formatActivityDuration(
                    reviewActivity.summary.durationSeconds
                  ),
                },
                {
                  label: "Distance",
                  value: units.distance(reviewActivity.summary.distanceMeters),
                },
              ]
            : []
        }
        saving={activityDialogBusy}
        discarding={activityDialogBusy}
        onOpenChange={(open) => {
          if (!open) setReviewActivity(null)
        }}
        onSave={async (title) => {
          if (!reviewActivity) return
          setActivityDialogBusy(true)
          try {
            await completeActivity({
              activityId: reviewActivity._id,
              title,
            })
            setReviewActivity(null)
            if (retryAfterResolve) {
              setRetryAfterResolve(false)
              void handleStart()
            }
          } finally {
            setActivityDialogBusy(false)
          }
        }}
        onDiscard={async () => {
          if (!reviewActivity) return
          setActivityDialogBusy(true)
          try {
            await discardActivity({ activityId: reviewActivity._id })
            setReviewActivity(null)
            if (retryAfterResolve) {
              setRetryAfterResolve(false)
              void handleStart()
            }
          } finally {
            setActivityDialogBusy(false)
          }
        }}
      />
      <RouteSimulationLiveView
        activeRouteTitle={route.activeRouteTitle}
        activity={activity}
        connection={connection}
        ride={ride}
        route={route.parsedRoute}
        progressMode={preferences.progressMode}
        session={session}
      />
    </>
  ) : null
}
