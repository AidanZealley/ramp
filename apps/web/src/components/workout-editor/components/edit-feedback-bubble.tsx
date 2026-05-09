import { AnimatePresence, motion } from "motion/react"

interface EditFeedbackBubbleProps {
  message: string | null
}

export function EditFeedbackBubble({ message }: EditFeedbackBubbleProps) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          key="edit-feedback-bubble"
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute top-2 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border/70 bg-background/95 px-3 py-1.5 text-xs font-medium text-foreground tabular-nums shadow-md backdrop-blur"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
