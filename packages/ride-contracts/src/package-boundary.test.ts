import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const repoRoot = join(__dirname, "../../..")
const packagesRoot = join(repoRoot, "packages")
const scannedDirectories = ["src", "test-utils"]
const sourceFilePattern = /\.(ts|tsx)$/
const forbiddenImportPattern =
  /(?:from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']|require\s*\(\s*["']([^"']+)["']\s*\))/g

function walk(directory: string): Array<string> {
  let files: Array<string> = []
  for (const entry of readdirSync(directory)) {
    if (entry === "node_modules") continue
    const path = join(directory, entry)
    const stat = statSync(path)
    if (stat.isDirectory()) {
      files = files.concat(walk(path))
    } else if (sourceFilePattern.test(entry)) {
      files.push(path)
    }
  }
  return files
}

function packageSourceFiles(): Array<string> {
  const files: Array<string> = []
  for (const packageName of readdirSync(packagesRoot)) {
    const packageRoot = join(packagesRoot, packageName)
    if (!statSync(packageRoot).isDirectory()) continue
    for (const directory of scannedDirectories) {
      const path = join(packageRoot, directory)
      try {
        if (statSync(path).isDirectory()) files.push(...walk(path))
      } catch {
        // Package has no matching test/source utility directory.
      }
    }
  }
  return files
}

function isForbiddenImport(specifier: string): boolean {
  return (
    specifier.includes("apps/web") ||
    specifier === "@ramp/web" ||
    specifier.startsWith("@ramp/web/") ||
    specifier === "@/" ||
    specifier.startsWith("@/") ||
    /(?:^|\/)\.\.(?:\/\.\.)*\/apps(?:\/|$)/.test(specifier)
  )
}

describe("package app boundary", () => {
  it("does not import app code from package source or package test utilities", () => {
    const violations = packageSourceFiles().flatMap((file) => {
      const contents = readFileSync(file, "utf8")
      const imports = [...contents.matchAll(forbiddenImportPattern)].map(
        (match) => match[1] ?? match[2] ?? match[3] ?? match[4] ?? ""
      )
      return imports
        .filter(isForbiddenImport)
        .map((specifier) => `${relative(repoRoot, file)} -> ${specifier}`)
    })

    expect(violations).toEqual([])
  })
})
