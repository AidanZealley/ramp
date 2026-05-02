import { useEffect, useRef, useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { ArrowLeft, Settings } from "lucide-react"
import { RideHud } from "./ride-hud"
import type { RideTrainerController } from "@/ride/use-ride-trainer"
import { Button } from "@/components/ui/button"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

type RideOverlayProps = {
  trainerController: RideTrainerController
}

const HIDE_DELAY_MS = 2000

export function RideOverlay({
  trainerController,
}: RideOverlayProps) {
  const navigate = useNavigate()
  const usingMockTrainer = trainerController.trainer.kind === "mock"

  const [shown, setShown] = useState(true)
  const [isOverlayOpen, setIsOverlayOpen] = useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const hasOpenSurface = isOverlayOpen || isExitDialogOpen

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

      const rect = contentRef.current?.getBoundingClientRect()
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
  }, [hasOpenSurface])

  const overlayVisible = shown || hasOpenSurface

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-999">
      <div
        ref={contentRef}
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
            {!usingMockTrainer && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={trainerController.useMockTrainer}
              >
                Use mock trainer
              </Button>
            )}
          </div>

          <Popover open={isOverlayOpen} onOpenChange={setIsOverlayOpen}>
            <PopoverTrigger
              render={
                <Button
                  size="icon"
                  variant="secondary"
                  aria-label={
                    isOverlayOpen
                      ? "Hide ride overlay panels"
                      : "Show ride overlay panels"
                  }
                />
              }
            >
              <Settings />
            </PopoverTrigger>
            <PopoverContent
              className="w-[min(720px,calc(100vw-1rem))]"
              align="end"
              side="bottom"
              sideOffset={10}
            >
              <RideHud />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
