import { useCallback, useEffect, useRef, useState } from "react"

const EDIT_FEEDBACK_IDLE_MS = 2000

export function useEditFeedbackBubble(): {
  message: string | null
  showMessage: (message: string) => void
} {
  const [message, setMessage] = useState<string | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const clearHideTimeout = useCallback(() => {
    if (timeoutRef.current === null) return
    window.clearTimeout(timeoutRef.current)
    timeoutRef.current = null
  }, [])

  const showMessage = useCallback(
    (nextMessage: string) => {
      clearHideTimeout()
      setMessage(nextMessage)
      timeoutRef.current = window.setTimeout(() => {
        setMessage(null)
        timeoutRef.current = null
      }, EDIT_FEEDBACK_IDLE_MS)
    },
    [clearHideTimeout]
  )

  useEffect(() => clearHideTimeout, [clearHideTimeout])

  return { message, showMessage }
}
