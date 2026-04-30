import { defineConfig } from "vitest/config"
import path from "node:path"
import viteReact from "@vitejs/plugin-react"

export default defineConfig({
  plugins: [
    viteReact(),
  ],
  resolve: {
    alias: {
      "@ramp/ride-core": path.resolve(__dirname, "../ride-core/src/index.ts"),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
  },
})
