type CockpitMetricProps = {
  label: string
  value: string
}

export function CockpitMetric({ label, value }: CockpitMetricProps) {
  return (
    <div className="max-w-full min-w-20">
      <div className="truncate text-[0.62rem] leading-none font-semibold tracking-widest uppercase">
        {label}
      </div>
      <div className="mt-1 truncate font-heading text-lg leading-none font-semibold tabular-nums sm:text-xl">
        {value}
      </div>
    </div>
  )
}
