# Ramp

Ramp is a training workspace for indoor cycling. It combines workout design,
training-plan organization, GPX route simulation, and ride activity history in a
single app.

The app is built around the day-to-day loop of planning structured training,
riding it, and reviewing what happened afterwards.

## What Ramp Does

- Build structured erg workouts with interval blocks, target powers, comments,
  and derived workout summaries.
- Import and export `.mrc` workouts for interoperability with trainer apps.
- Organize workouts into multi-week training plans.
- Upload GPX routes, inspect route stats and climbs, and ride route simulations
  with map progress.
- Run ride experiences including live workouts, ramp tests, route simulation,
  free ride, and trainer diagnostics.
- Save completed rides and keep unresolved activities available for review or
  resuming.
- Store user preferences such as FTP, units, bike/rider weight, power display
  mode, and route simulation behavior.
- Support account-based access with invite/admin tooling.

## Product Areas

- `Workouts`: a library and editor for designing reusable interval sessions.
- `Plans`: a schedule builder for arranging workouts across training weeks.
- `Routes`: GPX upload, route previews, route stats, and generated climb
  segments.
- `Ride`: interactive ride experiences for workouts, routes, ramp tests, free
  ride, and diagnostics.
- `Activities`: in-progress, pending, and completed ride records.
- `Account`: user preferences and session controls.

## Tech Stack

- TypeScript monorepo managed with pnpm workspaces.
- React 19 app built with Vite, TanStack Start, TanStack Router, and TanStack
  Query.
- Convex backend for authentication, real-time data, file storage, and server
  functions.
- Convex Auth for account flows and invite-gated access.
- Tailwind CSS v4 with local UI primitives built on Base UI, lucide-react, and
  shadcn-style components.
- Zustand for workout editor state.
- dnd-kit for drag-and-drop planning and editor interactions.
- MapLibre and `@vis.gl/react-maplibre` for route maps.
- Three.js and React Three Fiber for 3D ride experiences.
- Recharts for charts and ride/activity visualization.
- Workspace packages for ride runtime contracts, trainer I/O, workout logic,
  and React ride integration.
- Vitest, Testing Library, ESLint, Prettier, and Fallow for testing and codebase
  maintenance.
