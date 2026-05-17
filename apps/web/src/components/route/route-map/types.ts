import type { routeMapTheme } from "./colors"

export type RouteMapColors =
  (typeof routeMapTheme)[keyof typeof routeMapTheme]
