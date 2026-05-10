type TrainerStateGridProps = {
  fields: Array<[label: string, value: string]>
}

export function TrainerStateGrid({ fields }: TrainerStateGridProps) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
      {fields.map(([label, value]) => (
        <div key={label} className="min-w-0">
          <div className="text-[0.65rem] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
            {label}
          </div>
          <div className="truncate font-heading text-sm font-semibold">
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}
