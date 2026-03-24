#!/usr/bin/env bun
/**
 * Manual version bump script — sets all packages to the same version.
 * Usage: bun run scripts/version.ts 0.10.0
 *
 * This avoids the changesets 0.x minor → 1.0.0 issue.
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs"
import { join } from "node:path"

const version = process.argv[2]
if (!version || !/^\d+\.\d+\.\d+/.test(version)) {
  console.error("Usage: bun run scripts/version.ts <version>")
  console.error("Example: bun run scripts/version.ts 0.10.0")
  process.exit(1)
}

const packagesDir = join(import.meta.dir, "..", "packages")
const packages = readdirSync(packagesDir).filter((name) =>
  existsSync(join(packagesDir, name, "package.json")),
)

let updated = 0
for (const pkg of packages) {
  const pkgPath = join(packagesDir, pkg, "package.json")
  const content = readFileSync(pkgPath, "utf-8")
  const json = JSON.parse(content)
  const oldVersion = json.version

  if (oldVersion !== version) {
    json.version = version
    writeFileSync(pkgPath, `${JSON.stringify(json, null, 2)}\n`)
    console.log(`  @pyreon/${pkg}: ${oldVersion} → ${version}`)
    updated++
  }
}

// Also remove any pending changeset files
const changesetDir = join(import.meta.dir, "..", ".changeset")
const changesets = readdirSync(changesetDir).filter(
  (f) => f.endsWith(".md") && f !== "README.md",
)
for (const cs of changesets) {
  const csPath = join(changesetDir, cs)
  const content = readFileSync(csPath, "utf-8")
  if (content.includes('"@pyreon/')) {
    writeFileSync(csPath, "") // Empty it so changeset doesn't re-process
    console.log(`  Cleared changeset: ${cs}`)
  }
}

console.log(`\n✓ ${updated} packages updated to ${version}`)
console.log(`\nNext: git add . && git commit -m "chore: release v${version}" && git push`)
