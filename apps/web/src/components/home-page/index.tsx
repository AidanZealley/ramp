import { Link } from "@tanstack/react-router"
import { Activity, ArrowRight, CalendarDays } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function HomePage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <div className="px-4 py-12 text-center md:py-20">
        <h1 className="font-heading text-4xl font-semibold tracking-tight md:text-5xl">
          Design erg workouts.
          <br />
          <span className="bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent">
            Build training plans.
          </span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          A focused space for shaping intervals and stacking them into a
          progression that fits your season.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <CtaCard
          to="/workout"
          icon={<Activity className="size-5" />}
          title="Workouts"
          description="Sketch interval profiles, tune them by zone, and save them to your library."
          ctaLabel="Browse workouts"
        />
        <CtaCard
          to="/plan"
          icon={<CalendarDays className="size-5" />}
          title="Plans"
          description="Arrange workouts across weeks to map out a training block."
          ctaLabel="Browse plans"
        />
      </div>
    </div>
  )
}

interface CtaCardProps {
  to: "/workout" | "/plan"
  icon: React.ReactNode
  title: string
  description: string
  ctaLabel: string
}

function CtaCard({ to, icon, title, description, ctaLabel }: CtaCardProps) {
  return (
    <Link
      to={to}
      className="group block rounded-[calc(var(--radius)*2.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <Card
        size="sm"
        className="h-full transition-all group-hover:shadow-lg group-hover:ring-2 group-hover:ring-primary/20"
      >
        <CardContent className="flex flex-col gap-4">
          <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="font-heading text-lg font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button className="self-start">
            {ctaLabel}
            <ArrowRight />
          </Button>
        </CardContent>
      </Card>
    </Link>
  )
}
