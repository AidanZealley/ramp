import type { ActivityClientDoc } from "../types"
import type React from "react"

export type ActivityCardProps = {
  activity: ActivityClientDoc
  actions?: React.ReactNode
}
