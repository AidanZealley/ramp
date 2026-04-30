import type { RideGamePlugin } from "@ramp/ride-core"

export type RideGameDefinition = {
  id: string
  displayName: string
  description: string
  tags: string[]
  accent: {
    from: string
    to: string
    ink: string
  }
  preview: {
    eyebrow: string
    spotlight: string
  }
  plugin: RideGamePlugin
}
