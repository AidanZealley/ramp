import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Settings } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { RideCockpit } from "./ride-cockpit"
import type { SimulatedRiderState } from "@ramp/trainer-io"
import type { RideTrainerController } from "@/ride/use-ride-trainer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useElementSize } from "@/hooks/use-element-size"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

type RideOverlayProps = {
  trainerController: RideTrainerController
  isCockpitOpen?: boolean
  onCockpitHeightChange?: (height: number) => void
  onCockpitOpenChange?: (open: boolean) => void
  onHeaderHeightChange?: (height: number) => void
}

const HIDE_DELAY_MS = 2000

export function RideOverlay({
  trainerController,
  isCockpitOpen: controlledIsCockpitOpen,
  onCockpitHeightChange,
  onCockpitOpenChange,
  onHeaderHeightChange,
}: RideOverlayProps) {
  const navigate = useNavigate()
  const simulatedRider = trainerController.simulatedRider

  const [shown, setShown] = useState(true)
  const [uncontrolledIsCockpitOpen, setUncontrolledIsCockpitOpen] =
    useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [riderState, setRiderState] = useState<SimulatedRiderState | null>(
    simulatedRider?.state ?? null
  )
  const {
    element: headerElement,
    ref: headerRef,
    size: headerSize,
  } = useElementSize<HTMLDivElement>()
  const { ref: cockpitRef, size: cockpitSize } =
    useElementSize<HTMLDivElement>()
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const isCockpitOpen = controlledIsCockpitOpen ?? uncontrolledIsCockpitOpen
  const setIsCockpitOpen = (open: boolean) => {
    if (controlledIsCockpitOpen === undefined) {
      setUncontrolledIsCockpitOpen(open)
    }
    onCockpitOpenChange?.(open)
  }

  const hasOpenSurface = isCockpitOpen || isExitDialogOpen
  const sourceLabel =
    trainerController.source === "simulated"
      ? "Simulator"
      : trainerController.source === "ble"
        ? "Bluetooth trainer"
        : "No trainer"

  useEffect(() => {
    if (!simulatedRider) {
      setRiderState(null)
      return
    }
    setRiderState(simulatedRider.state)
    return simulatedRider.subscribeState(setRiderState)
  }, [simulatedRider])

  const scheduleHide = () => {
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setShown(false), HIDE_DELAY_MS)
  }

  useEffect(() => {
    if (hasOpenSurface) {
      clearTimeout(timerRef.current)
      setShown(true)
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      setShown(true)

      const rect = headerElement?.getBoundingClientRect()
      const isOverOverlay =
        rect != null &&
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom

      if (isOverOverlay) {
        clearTimeout(timerRef.current)
      } else {
        scheduleHide()
      }
    }

    scheduleHide()

    document.addEventListener("mousemove", handleMouseMove)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      clearTimeout(timerRef.current)
    }
  }, [hasOpenSurface, headerElement])

  useEffect(() => {
    onCockpitHeightChange?.(isCockpitOpen ? cockpitSize.height : 0)
  }, [cockpitSize.height, isCockpitOpen, onCockpitHeightChange])

  useEffect(() => {
    onHeaderHeightChange?.(headerSize.height)
  }, [headerSize.height, onHeaderHeightChange])

  const overlayVisible = shown || hasOpenSurface

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0">
      <div
        ref={headerRef}
        className={`bg-linear-to-b from-background/50 to-transparent transition-opacity duration-500 ease-in-out ${
          overlayVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top bar: back + settings buttons */}
        <div
          className={`flex items-center justify-between px-4 py-2 ${
            overlayVisible ? "pointer-events-auto" : "pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertDialog
              open={isExitDialogOpen}
              onOpenChange={setIsExitDialogOpen}
            >
              <AlertDialogTrigger
                render={
                  <Button
                    size="icon"
                    variant="secondary"
                    aria-label="Back to ride picker"
                  />
                }
              >
                <ArrowLeft />
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Exit ride?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Your current ride session will end and you&apos;ll return to
                    the ride picker.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Stay here</AlertDialogCancel>
                  <AlertDialogAction
                    type="button"
                    onClick={() => void navigate({ to: "/ride" })}
                  >
                    Exit ride
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={
                !trainerController.bleAvailable ||
                trainerController.selectingBleTrainer
              }
              onClick={() => {
                void trainerController.connectBleTrainer()
              }}
            >
              {trainerController.selectingBleTrainer
                ? "Opening Bluetooth"
                : "Connect trainer"}
            </Button>
            {!trainerController.bleAvailable && (
              <span className="text-xs text-muted-foreground">
                Web Bluetooth requires a Chromium-class browser.
              </span>
            )}
            {trainerController.devSimulationEnabled &&
              trainerController.source !== "simulated" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={trainerController.useSimulatedTrainer}
                >
                  Use simulator
                </Button>
              )}
            {trainerController.source !== "none" && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={trainerController.disconnectTrainer}
              >
                Disconnect
              </Button>
            )}

            <Badge>{sourceLabel}</Badge>
          </div>

          <Button
            size="icon"
            variant="secondary"
            aria-label={
              isCockpitOpen ? "Hide ride cockpit" : "Show ride cockpit"
            }
            type="button"
            onClick={() => setIsCockpitOpen(!isCockpitOpen)}
          >
            <Settings />
          </Button>
        </div>
      </div>
      <AnimatePresence>
        {isCockpitOpen ? (
          <RideCockpit
            key="ride-cockpit"
            rootRef={cockpitRef}
            trainerController={trainerController}
            riderState={riderState}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
