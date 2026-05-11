import { cn } from "@/lib/utils"

type IntervalCommentProps = {
  comment: string
}

export const IntervalComment = ({ comment }: IntervalCommentProps) => {
  const hasComment = comment.trim().length > 0

  return (
    <section className="min-w-0" aria-label="Interval cue">
      <div className="text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
        Cue
      </div>
      <p
        className={cn(
          "mt-1 truncate text-lg font-medium md:text-xl",
          !hasComment && "text-sm text-muted-foreground md:text-base"
        )}
      >
        {hasComment ? comment : "No interval comment"}
      </p>
    </section>
  )
}
