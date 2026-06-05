# Ramp

Ramp is a focused training planner for erg workouts.

It lets you design interval sessions, store them as a workout library, arrange them into multi-week plans, and move workouts in and out of `.mrc` files used by trainer apps.

## What It Does

- Build interval workouts with a visual editor.
- Save workouts with derived summaries like duration and stress.
- Add interval comments and export them into `.mrc` course text.
- Import existing `.mrc` workouts back into the editor.
- Organize saved workouts into week-based training plans.
- Switch power display between `%FTP` and absolute watts.
- Persist workout data and plan data in Convex.

## Product Shape

Ramp is built around two core flows:

- `Workouts`: sketch interval blocks, tune power targets, annotate steps, and maintain a reusable library.
- `Plans`: place workouts across week rows and map out a training block over time.

The app is intentionally narrow in scope: fewer dashboards, more actual planning.

## Stack

- React 19
- TanStack Start + TanStack Router
- Convex for backend state and persistence
- TypeScript
- Tailwind CSS v4
- shadcn/ui primitives
- Zustand for editor state
- Vitest + Testing Library

## Local Development

### Prerequisites

- Node.js
- npm
- A Convex account/project for local development

### Install

```bash
npm install
```

Copy the example environment file before starting local development:

```bash
cp .env.example .env.local
```

### Run

```bash
npm run dev
```

This starts:

- the web app via Vite
- the Convex dev process

On first run, Convex will prompt you to connect or create a project and will populate the local env values the app needs, including `VITE_CONVEX_URL`.

### Useful Commands

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

### Codebase Analysis

Ramp uses Fallow for local codebase intelligence: dead-code detection, duplication checks, complexity hotspots, and package boundary checks.

```bash
pnpm fallow:list
pnpm fallow:dead-code
pnpm fallow:boundaries
pnpm fallow:dupes
pnpm fallow:health
pnpm fallow:audit
pnpm fallow:fix:dry-run
```

Fallow findings are warnings during initial adoption. Do not run `fallow fix` without `--dry-run` unless the resulting edits are reviewed.

## Data Model

Convex currently stores:

- `workouts`
- `plans`
- `planWeeks`
- `planWeekWorkouts`
- `users` with auth-managed profile fields plus per-user settings

Ramp uses Convex Auth with password sign-in. Password sign-up is intentionally
open for now, so anyone with the deployed app can create an account. Auth error
messages stay generic and do not disclose whether an email address already
exists.

## Import / Export

Ramp supports `.mrc` import and export for interoperability with common indoor training apps.

- Export normalizes workouts to `%FTP`-based MRC output.
- Import parses workout steps and interval text cues back into the editor.

## Status

Ramp is an active build, not a polished product release. The repo already includes:

- a workout editor
- workout duplication
- week-based plan composition
- settings for FTP and power display mode
- tests around workout logic and MRC parsing/export

## Roadmap Ideas

- Athlete accounts and per-user data isolation
- Smarter plan progression tools
- Additional export formats
