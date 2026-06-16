export type RideConnectionControlProps = {
  onDisconnect?: () => Promise<void> | void
  className?: string
}

export type RideConnectionPanelProps = {
  compact?: boolean
  hideIntro?: boolean
}

export type RideConnectionDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}
