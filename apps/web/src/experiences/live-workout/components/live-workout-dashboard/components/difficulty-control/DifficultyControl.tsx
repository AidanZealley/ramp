import { Button } from "@/components/ui/button"

type DifficultyControlProps = {
  difficultyPercent: number
  minPercent: number
  maxPercent: number
  onDecrease: () => void
  onIncrease: () => void
  onReset: () => void
}

export const DifficultyControl = ({
  difficultyPercent,
  maxPercent,
  minPercent,
  onDecrease,
  onIncrease,
  onReset,
}: DifficultyControlProps) => {
  const roundedDifficultyPercent = Math.round(difficultyPercent)

  return (
    <section className="min-w-0" aria-label="Workout difficulty">
      <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Difficulty
      </div>
      <div className="mt-2 flex h-10 items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="size-9 text-lg leading-none"
          onClick={onDecrease}
          disabled={roundedDifficultyPercent <= minPercent}
          aria-label="Decrease workout difficulty"
        >
          -
        </Button>
        <div className="flex h-9 min-w-16 items-center justify-center rounded-full border bg-background px-3 text-lg font-semibold tabular-nums">
          {roundedDifficultyPercent}%
        </div>
        <Button
          type="button"
          variant="secondary"
          size="icon-sm"
          className="size-9 text-lg leading-none"
          onClick={onIncrease}
          disabled={roundedDifficultyPercent >= maxPercent}
          aria-label="Increase workout difficulty"
        >
          +
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 min-w-16"
          onClick={onReset}
          disabled={roundedDifficultyPercent === 100}
          aria-label="Reset workout difficulty"
        >
          Reset
        </Button>
      </div>
    </section>
  )
}
