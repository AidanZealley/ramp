export const routeMapStyleUrls = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const

export const routeMapTheme = {
  light: {
    routeLine: "#4f46e5",
    routeLineShadow: "rgba(0,0,0,0.24)",
    startPoint: "#65a30d",
    finishPoint: "#dc2626",
  },
  dark: {
    routeLine: "#4f46e5",
    routeLineShadow: "rgba(0,0,0,0.65)",
    startPoint: "#65a30d",
    finishPoint: "#dc2626",
  },
} as const
