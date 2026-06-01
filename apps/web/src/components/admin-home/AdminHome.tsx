import { Link } from "@tanstack/react-router"
import { Mail } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type AdminSection = {
  title: string
  description: string
  to: "/admin/invites"
  icon: LucideIcon
}

const adminSections: Array<AdminSection> = [
  {
    title: "Invites",
    description: "Manage invite codes and control access to the app.",
    to: "/admin/invites",
    icon: Mail,
  },
]

export const AdminHome = () => {
  return (
    <section className="mx-auto max-w-4xl">
      <h1 className="font-heading text-2xl font-semibold">Admin</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {adminSections.map((section) => {
          const Icon = section.icon
          return (
            <Link key={section.to} to={section.to}>
              <Card className="h-full transition-all hover:shadow-lg hover:ring-foreground/10">
                <CardHeader className="gap-3">
                  <div className="flex size-10 items-center justify-center rounded-xl bg-muted">
                    <Icon className="size-5 text-muted-foreground" />
                  </div>
                  <CardTitle>{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
