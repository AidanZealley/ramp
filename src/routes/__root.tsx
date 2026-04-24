import { QueryClient } from "@tanstack/react-query"
import {
  createRootRouteWithContext,
  Outlet,
  Link,
} from "@tanstack/react-router"
import { HeadContent, Scripts } from "@tanstack/react-router"
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools"
import { TanStackDevtools } from "@tanstack/react-devtools"
import { SettingsDialog } from "@/components/settings-dialog"
import { ModeToggle } from "@/components/mode-toggle"
import appCss from "../styles.css?url"
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
        title: "ERG Generator",
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

  return (
    <ThemeProvider theme={theme}>
      <RootDocument theme={theme}>
        <div className="flex min-h-svh flex-col">
          <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-lg">
            <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
              <Link
                to="/"
                className="flex items-center gap-2 transition-opacity hover:opacity-80"
              >
                <span className="font-heading text-lg font-semibold tracking-tight">
                  ERG Generator
                </span>
              </Link>

              <div className="flex items-center gap-3">
                <ModeToggle />
                <SettingsDialog />
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
            <Outlet />
          </main>
        </div>
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
