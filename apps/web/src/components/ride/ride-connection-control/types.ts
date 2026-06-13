import type { RideRuntimeController } from "@/ride/use-ride-runtime"

export type RideConnectionControlProps = {
  runtime?: RideRuntimeController
  onDisconnect?: () => Promise<void> | void
  className?: string
}

export type RideConnectionPanelProps = {
  runtime?: RideRuntimeController
  compact?: boolean
  hideIntro?: boolean
}

export type RideConnectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}
