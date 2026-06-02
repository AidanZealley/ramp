import type { LucideIcon } from "lucide-react"

export type MetricPodProps = {
  label: string
  value: number | null
  unit: string
  /** Fraction (0–1) the pod arc should fill. */
  fill: number
  /** Accent colour for the arc, icon and glow. */
  color: string
  icon: LucideIcon
  /** Which side the pod sits on — flips the arc + icon to mirror the layout. */
  side: "left" | "right"
}
