export const routeMapStyleUrls = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
} as const

export const routeMapTheme = {
  light: {
    routeLine: "#4f46e5",
    routeLineShadow: "rgba(0,0,0,0.24)",
    riderHalo: "rgba(255,255,255,0.92)",
    startPoint: "#65a30d",
    finishPoint: "#dc2626",
    terrainShadow: "#64748b",
    terrainHighlight: "#ffffff",
    terrainAccent: "#94a3b8",
  },
  dark: {
    routeLine: "#818cf8",
    routeLineShadow: "rgba(0,0,0,0.65)",
    riderHalo: "rgba(15,23,42,0.9)",
    startPoint: "#84cc16",
    finishPoint: "#f87171",
    terrainShadow: "#020617",
    terrainHighlight: "#475569",
    terrainAccent: "#1e293b",
  },
} as const
