//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  { ignores: [".output/**", "convex/_generated/**"] },
  ...tanstackConfig,
]
