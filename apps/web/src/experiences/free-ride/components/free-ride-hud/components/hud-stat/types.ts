export type HudStatProps = {
  label: string
  value: string
  /** Text alignment — top-left stats read left, the grade reads right. */
  align?: "left" | "right"
  /** Optional accent colour applied to the value's glow. */
  accent?: string
}
