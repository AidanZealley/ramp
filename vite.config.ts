import { defineConfig } from "vitest/config"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"
import { nitro } from "nitro/vite"

const config = defineConfig(({ mode }) => ({
  plugins:
    mode === "test"
      ? [
          viteTsConfigPaths({
            projects: ["./tsconfig.json"],
          }),
          tailwindcss(),
          viteReact(),
        ]
      : [
          devtools(),
          nitro(),
          viteTsConfigPaths({
            projects: ["./tsconfig.json"],
          }),
          tailwindcss(),
          tanstackStart(),
          viteReact(),
        ],
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
  },
}))

export default config
