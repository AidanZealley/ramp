import type { ActivityMetric } from "../activity-summary-metrics"

export type EndActivityDialogProps = {
  open: boolean
  title: string
  description?: string
  metrics?: Array<ActivityMetric>
  busy?: boolean
  onOpenChange: (open: boolean) => void
  onSaveActivity: () => void | Promise<void>
  onCompleteLater: () => void | Promise<void>
  onDiscard: () => void | Promise<void>
}
