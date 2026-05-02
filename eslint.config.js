//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  {
    ignores: [
      ".output/**",
      "apps/web/.output/**",
      "apps/web/dist/**",
      "convex/_generated/**",
      "eslint.config.js",
    ],
  },
  ...tanstackConfig,
]
