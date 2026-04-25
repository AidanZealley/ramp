export { workoutToMrc } from "./mrc"
export type { MrcExportInput } from "./mrc"

/**
 * Trigger a browser download of `content` as a file named `filename`.
 *
 * Lives at the module root (rather than in `mrc.ts`) so future exporters
 * (`erg.ts`, `zwo.ts`, …) can share it.
 */
export function downloadTextFile(
  content: string,
  filename: string,
  mimeType = "text/plain"
): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.style.display = "none"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
