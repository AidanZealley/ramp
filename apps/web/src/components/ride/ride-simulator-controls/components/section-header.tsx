type SectionHeaderProps = {
  description: string
  eyebrow: string
  title: string
}

export function SectionHeader({
  description,
  eyebrow,
  title,
}: SectionHeaderProps) {
  return (
    <div>
      <div className="text-[0.65rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
        {eyebrow}
      </div>
      <div className="mt-1 font-heading text-base font-semibold text-foreground">
        {title}
      </div>
      <div className="text-sm text-muted-foreground">{description}</div>
    </div>
  )
}
