import { useEffect, useCallback } from "react"

/**
 * Registers a document-level keydown listener for a specific key.
 *
 * The listener is automatically cleaned up on unmount or when
 * the key / callback changes. Events targeting interactive
 * elements (input, textarea, select, contentEditable) are ignored
 * so keyboard shortcuts don't fire while the user is typing.
 *
 * @param key      The `KeyboardEvent.key` value to listen for (e.g. "Backspace", "Escape", "ArrowUp").
 * @param callback Fired when the key is pressed. Receives the raw `KeyboardEvent`.
 */
export function useKeypress(key: string, callback: (e: KeyboardEvent) => void) {
  const stableCallback = useCallback(
    (e: KeyboardEvent) => {
      callback(e)
    },
    [callback]
  )

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== key) return

      // Don't intercept when the user is typing in an input
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return
      }

      stableCallback(e)
    }

    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [key, stableCallback])
}
