import type { ReactNode } from "react"

type CockpitSectionProps = {
  title: string
  children: ReactNode
}

export function CockpitSection({ title, children }: CockpitSectionProps) {
  return (
    <section className="grid min-w-0 gap-2">
      <h2 className="text-[0.65rem] leading-none font-semibold tracking-[0.14em] uppercase">
        {title}
      </h2>
      <div className="grid min-w-0 gap-3">{children}</div>
    </section>
  )
}
