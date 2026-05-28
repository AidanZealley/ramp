import { Link } from "@tanstack/react-router"
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu"

type AppNavProps = {
  activityActive: boolean
  workoutsActive: boolean
  plansActive: boolean
  routeActive: boolean
  rideActive: boolean
}

const NAV_ITEMS = [
  {
    label: "Workouts",
    to: "/workout" as const,
    active: "workoutsActive" as const,
  },
  { label: "Plans", to: "/plan" as const, active: "plansActive" as const },
  { label: "Routes", to: "/route" as const, active: "routeActive" as const },
  { label: "Ride", to: "/ride" as const, active: "rideActive" as const },
  {
    label: "Activities",
    to: "/activity" as const,
    active: "activityActive" as const,
  },
]

export const AppNav = ({
  activityActive,
  workoutsActive,
  plansActive,
  routeActive,
  rideActive,
}: AppNavProps) => {
  const activeMap = {
    activityActive,
    workoutsActive,
    plansActive,
    routeActive,
    rideActive,
  }

  return (
    <NavigationMenu>
      <NavigationMenuList>
        {NAV_ITEMS.map(({ label, to, active }) => (
          <NavigationMenuItem key={to}>
            <NavigationMenuLink
              render={<Link to={to} />}
              data-active={activeMap[active]}
            >
              {label}
            </NavigationMenuLink>
          </NavigationMenuItem>
        ))}
      </NavigationMenuList>
    </NavigationMenu>
  )
}
