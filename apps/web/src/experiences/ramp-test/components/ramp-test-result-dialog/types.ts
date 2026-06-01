export type RampTestResultDialogProps = {
  open: boolean
  calculatedFtp: number | null
  currentFtp: number
  failed: boolean
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onContinue: () => void | Promise<void>
}
