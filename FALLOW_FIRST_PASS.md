# Fallow First Pass

Date: 2026-06-05

This was a discovery and triage pass only. No Fallow autofix was applied, `pnpm format` was not run, and no source cleanup was performed.

## Command Results

- `pnpm typecheck`: passed. All workspace typecheck scripts completed successfully.
- `pnpm test`: passed. All workspace tests completed successfully. Existing Node ESM experimental warnings and `useRouter` test warnings appeared, but there were no test failures.
- `pnpm fallow:list`: passed. Active plugins: `convex`, `vitest`, `eslint`, `prettier`, `typescript`, `tanstack-router`, `vite`, `tailwind`. Boundary zones resolved with non-zero file counts.
- `pnpm fallow:boundaries`: passed. No boundary violations found.
- `pnpm fallow:dead-code`: completed with warnings. Found 1 unused dependency and 1 unused devDependency.
- `pnpm fallow:fix:dry-run`: completed. Would remove the same 2 dependency entries only. Reported that no files were modified.
- `pnpm fallow:dupes`: completed with warnings. Reported 135 clone groups, 15 clone families, and 3,811 duplicated lines across 60 files.
- `pnpm fallow:health`: completed in report-only mode. Health score `74 B`; main deductions were hotspots, unit size, duplication, unused deps, and coupling. Reported 61 high-complexity functions above threshold.
- `pnpm fallow:audit`: completed. Compared 5 changed files vs `main`; found no issues in changed files and excluded 2 inherited dependency findings from the audit gate.

## Boundary Findings

| Finding | Classification | Proposed Action |
| --- | --- | --- |
| No boundary violations found. | none | No code or config action needed from this pass. |

## Dead-Code Findings

| Finding | Classification | Proposed Action |
| --- | --- | --- |
| `@dnd-kit/utilities` in `apps/web/package.json` dependencies | dependency cleanup candidate | Remove in a later cleanup pass after confirming package-manager lockfile update. Search found no source imports, only package and lockfile references. |
| `web-vitals` in `apps/web/package.json` devDependencies | dependency cleanup candidate | Remove in a later cleanup pass after confirming no runtime/config reporting hook is planned. Search found no source imports, only package and lockfile references. |

## Autofix Candidates

| Candidate | Safe? | Reason |
| --- | --- | --- |
| Remove `@dnd-kit/utilities` from `apps/web/package.json` dependencies | likely | Dry-run only touched the package dependency entry. Source search found no imports. Still verify lockfile and app tests in the cleanup PR. |
| Remove `web-vitals` from `apps/web/package.json` devDependencies | likely | Dry-run only touched the package devDependency entry. Source search found no imports or reporting usage. Still verify lockfile and app tests in the cleanup PR. |

## Duplication Findings

| Finding | Classification | Proposed Action |
| --- | --- | --- |
| `apps/web/src/experiences/live-workout/live-workout-experience-view.tsx` and `apps/web/src/experiences/ramp-test/ramp-test-experience-view.tsx` share 217 lines across 3 clone groups, including a 167-line group | needs product/design judgement | Defer. These are separate experiences; extract only if a shared session orchestration abstraction is clearly tested and does not obscure behavior. |
| `apps/web/src/experiences/route-simulation/route-simulation-experience-view.tsx` has two large internal groups, 109 lines total | candidate for extraction | Investigate as a route-simulation-specific refactor after reviewing behavior and tests. |
| `apps/web/src/hooks/activity/use-activity-session.ts` had duplicated start-flow branches, 48 lines | completed | Refactored into a shared activity-start flow. Verified with `pnpm fallow dupes --trace apps/web/src/hooks/activity/use-activity-session.ts:86` and `pnpm fallow:dupes`; the previous clone group is gone. |
| `LiveWorkoutDashboard.tsx` and `RampTestDashboard.tsx` share 119 lines across 6 clone groups | needs product/design judgement | Defer UI abstraction unless the repeated parts are logic-level dashboard calculations or stable subcomponents. |
| `plan-actions-menu.tsx` and `workout-actions-menu.tsx` share 67 lines across 3 clone groups | intentional duplication / possible extraction | Low priority. Menus may diverge by product context; consider only a small shared action-menu primitive if churn continues. |
| Large test clone families in workout editor, live workout, and route simulation tests | test support / keep | Do not prioritize cleanup in first implementation pass. Consider local test helpers only when they clarify setup. |
| Remaining 125 clone groups | ignore for now | Below the first-pass priority threshold until package, Convex, shared library, and runtime findings are addressed. |

## Health Hotspots

| File/Function | Classification | Proposed Action |
| --- | --- | --- |
| `packages/ride-core/src/controller.ts` / `createRideSession`, `dispatch`, `connectTrainer` | test before refactor | High priority because it is ride runtime/session control code. Existing tests pass; add focused coverage before splitting session state, trainer connection, and dispatch logic. |
| `apps/web/src/experiences/live-workout/live-workout-experience-view.tsx` / `LiveWorkoutExperienceView`, `handleStart` | near-term refactor | High-priority workout/session execution hotspot. Extract orchestration or state derivation only behind existing behavior tests. |
| `apps/web/src/components/workout-editor/store/create-store.ts` / `createWorkoutEditorStore` | test before refactor | Large, actively edited editor state module. Strengthen tests around editing transactions before extracting store slices/helpers. |
| `apps/web/src/components/workout-editor/components/interval-block.tsx` / `IntervalBlock` | candidate for extraction | Fallow identifies this as a high-confidence refactor target. Extract display/calculation helpers or child components in a focused UI pass. |
| `apps/web/src/experiences/route-simulation/hooks/use-route-simulation-ride.ts` | test before refactor | Route simulation runtime hook with critical estimated risk. Add targeted hook tests before decomposing ride progression and side effects. |
| `apps/web/src/experiences/route-simulation/components/route-simulation-map/hooks/use-route-camera.ts` | candidate for extraction | Extract camera math/state transitions if covered by route simulation map tests. |
| `packages/trainer-io/src/transports/bluetooth/ftms/index.ts` / `sendCommand`, `mergeReadCapabilities` | test before refactor | Trainer IO code is runtime-critical. Refactor only after protocol behavior and error cases are covered. |
| `packages/ride-workouts/src/controller.ts` / `update` | test before refactor | Workout execution logic. Existing controller tests pass; expand coverage around interval transitions before refactoring. |
| `apps/web/src/lib/importers/mrc.ts` / `parseMrc` | candidate for extraction | Good isolated parser target. Extract token parsing/validation phases with current importer tests as guardrails. |
| `convex/routeSegmentValidators.ts` / `validateGeneratedRouteSegments` | known complex / defer | Convex static-analysis finding only. Review with Convex runtime conventions before changing; no first-pass code change. |
| `convex/workouts.ts`, `convex/activities.ts`, `convex/plans.ts`, `convex/routes.ts` hotspots | test before refactor | Backend mutations/queries may include authorization and data shaping. Apply Convex guidelines and add tests before any cleanup. |

## Config Follow-Ups

| Issue | Proposed Config Change |
| --- | --- |
| No boundary config gaps found. | None. |
| Dead-code report did not produce generated route, TanStack, Convex discovery, or package public API noise. | None for first pass. Revisit only if future scans start flagging framework-discovered files or package `src/index.ts` exports. |
| Duplication report is noisy for tests and UI clone groups. | Consider raising duplication thresholds or excluding test-only clone families only if the report becomes too noisy for PR review. Do not change config yet. |
| Health report includes static coverage gaps and generated UI/library files. | Keep `fallow:health` as report-only. Consider coverage-backed health later using a real coverage artifact. |

## Completed Cleanup

- Removed direct web dependencies `@dnd-kit/utilities` and `web-vitals`; `pnpm fallow:dead-code` now reports no issues.
- Refactored `apps/web/src/hooks/activity/use-activity-session.ts` start-flow duplication; the previous Fallow clone group is no longer reported.

## Cleanup Backlog

1. Keep boundary rules as-is; no boundary violations or config gaps were found.
2. Add or strengthen tests before refactoring `packages/ride-core/src/controller.ts`, especially session creation, dispatch, and trainer connection behavior.
3. Split high-value workout execution/editor hotspots: `LiveWorkoutExperienceView`, `createWorkoutEditorStore`, and `IntervalBlock`.
4. Treat live workout/ramp test duplication as a product-design decision, not an automatic abstraction.
5. Consider parser-focused extraction in `apps/web/src/lib/importers/mrc.ts` as a low-risk health improvement.
6. Review trainer IO FTMS command handling with protocol tests before any refactor.
7. Review Convex hotspots only with Convex runtime discovery and authorization rules in mind.
8. Consider adding `pnpm fallow:audit` to CI only after the local workflow remains low-noise across a few cleanup changes.
