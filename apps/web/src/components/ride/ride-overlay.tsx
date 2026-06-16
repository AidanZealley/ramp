import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Settings } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { RideConnectionControl } from "./ride-connection-control"
import { RideCockpit } from "./ride-cockpit"
import type { RideRuntimeController } from "@/ride/use-ride-runtime"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/mode-toggle"
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
  trainerController: RideRuntimeController
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

  const [shown, setShown] = useState(true)
  const [uncontrolledIsCockpitOpen, setUncontrolledIsCockpitOpen] =
    useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [isDisconnectDialogOpen, setIsDisconnectDialogOpen] = useState(false)
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

  const hasOpenSurface =
    isCockpitOpen || isExitDialogOpen || isDisconnectDialogOpen

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
        className={`transition-opacity duration-500 ease-in-out ${
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
                    You&apos;ll return to the ride picker. Your trainer
                    connection will stay active.
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

            <RideConnectionControl
              onDisconnect={() => {
                setIsDisconnectDialogOpen(true)
              }}
            />
            <AlertDialog
              open={isDisconnectDialogOpen}
              onOpenChange={setIsDisconnectDialogOpen}
            >
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect trainer?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This disconnects your trainer and returns to the ride
                    connection screen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel type="button">Keep connected</AlertDialogCancel>
                  <AlertDialogAction
                    type="button"
                    onClick={() => {
                      void trainerController.disconnectTrainer().then(() => {
                        void navigate({ to: "/ride" })
                      })
                    }}
                  >
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
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
      </div>
      <AnimatePresence>
        {isCockpitOpen ? (
          <RideCockpit
            key="ride-cockpit"
            rootRef={cockpitRef}
            trainerController={trainerController}
          />
        ) : null}
      </AnimatePresence>
    </div>
  )
}
