# Package Cookbook

To add a package from `_template`:

1. Copy `packages/_template` to `packages/<name>`.
2. Rename `package.json` from `@ramp/__rename_me__` to `@ramp/<name>`.
3. Add an app path alias in `apps/web/tsconfig.json` if the web app imports it.
4. Add `"@ramp/<name>": "workspace:*"` to `apps/web/package.json` when consumed by the app.
5. Add the package to the root `build` script filter if it should build in CI.
