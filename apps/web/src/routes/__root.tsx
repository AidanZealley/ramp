import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useRouterState,
} from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { AuthLoading, Authenticated, Unauthenticated } from "convex/react"
import appCss from "../styles.css?url"
import type { QueryClient } from "@tanstack/react-query"
import { AuthenticatedAppShell } from "@/components/authenticated-app-shell"
import { AuthScreen } from "@/components/auth-screen"
import { ThemeProvider } from "@/components/theme-provider"
import { getThemeServerFn } from "@/lib/theme"

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "Ramp",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  component: RootLayout,
  loader: () => getThemeServerFn(),
  notFoundComponent: () => (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="font-heading text-2xl font-medium">404</h1>
      <p className="mt-2 text-muted-foreground">
        The requested page could not be found.
      </p>
    </main>
  ),
})

function RootLayout() {
  const theme = Route.useLoaderData()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const workoutsActive = pathname.startsWith("/workout")
  const plansActive = pathname.startsWith("/plan")
  const routeActive = pathname.startsWith("/route")
  const rideActive = pathname.startsWith("/ride")
  const rideImmersive = pathname.startsWith("/ride/")

  return (
    <ThemeProvider theme={theme}>
      <RootDocument theme={theme}>
        <AuthLoading>
          <main className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
            Loading...
          </main>
        </AuthLoading>
        <Unauthenticated>
          <AuthScreen />
        </Unauthenticated>
        <Authenticated>
          <AuthenticatedAppShell
            rideImmersive={rideImmersive}
            workoutsActive={workoutsActive}
            plansActive={plansActive}
            routeActive={routeActive}
            rideActive={rideActive}
          />
        </Authenticated>
      </RootDocument>
    </ThemeProvider>
  )
}

function RootDocument({
  children,
  theme,
}: {
  children: React.ReactNode
  theme: string
}) {
  return (
    <html lang="en" className={theme} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <TanStackDevtools
          config={{
            position: "bottom-right",
          }}
          plugins={[
            {
              name: "Tanstack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
