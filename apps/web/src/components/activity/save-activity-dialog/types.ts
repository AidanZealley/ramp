import type { ReactNode } from "react"
import type { ActivityMetric } from "../activity-summary-metrics"

export type SaveActivityDialogProps = {
  open: boolean
  defaultTitle: string
  description?: string
  metrics?: Array<ActivityMetric>
  children?: ReactNode
  saving?: boolean
  discarding?: boolean
  onOpenChange: (open: boolean) => void
  onSave: (title: string) => void | Promise<void>
  onDiscard: () => void | Promise<void>
}
