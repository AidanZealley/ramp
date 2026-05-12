import { useCallback, useState } from "react"
import {
  MAX_DIFFICULTY_PERCENT,
  MIN_DIFFICULTY_PERCENT,
} from "@ramp/ride-workouts"
import { useKeypress } from "@/hooks/use-keypress"

type UseWorkoutKeypressesProps = {
  difficultyPercent: number
  isComplete: boolean
  paused: boolean
  onDifficultyChange: (difficultyPercent: number) => void | Promise<void>
  onPause?: () => void
  onResume?: () => void
}

export function useWorkoutKeypresses({
  difficultyPercent,
  isComplete,
  paused,
  onDifficultyChange,
  onPause,
  onResume,
}: UseWorkoutKeypressesProps) {
  const [stopDialogOpen, setStopDialogOpen] = useState(false)

  useKeypress(
    " ",
    useCallback(
      (event: KeyboardEvent) => {
        if (isComplete) return
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
          return
        }

        event.preventDefault()
        if (paused) {
          onResume?.()
          return
        }
        onPause?.()
      },
      [isComplete, onPause, onResume, paused]
    )
  )

  useKeypress(
    "Escape",
    useCallback(
      (event: KeyboardEvent) => {
        if (isComplete) return

        event.preventDefault()
        setStopDialogOpen(true)
      },
      [isComplete]
    )
  )

  useKeypress(
    "ArrowUp",
    useCallback(
      (event: KeyboardEvent) => {
        if (isComplete) return
        const roundedDifficultyPercent = Math.round(difficultyPercent)
        if (roundedDifficultyPercent >= MAX_DIFFICULTY_PERCENT) return

        event.preventDefault()
        void onDifficultyChange(roundedDifficultyPercent + 1)
      },
      [difficultyPercent, isComplete, onDifficultyChange]
    )
  )

  useKeypress(
    "ArrowDown",
    useCallback(
      (event: KeyboardEvent) => {
        if (isComplete) return
        const roundedDifficultyPercent = Math.round(difficultyPercent)
        if (roundedDifficultyPercent <= MIN_DIFFICULTY_PERCENT) return

        event.preventDefault()
        void onDifficultyChange(roundedDifficultyPercent - 1)
      },
      [difficultyPercent, isComplete, onDifficultyChange]
    )
  )

  return {
    stopDialogOpen,
    setStopDialogOpen,
  }
}
