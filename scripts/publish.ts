/**
 * Publish all @pyreon/* packages via `npm publish --provenance`.
 * Resolves workspace:^ → ^X.Y.Z before publish, restores after.
 * Skips already-published versions and private packages.
 *
 * Usage: bun run scripts/publish.ts [--dry-run]
 */

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const PACKAGES_DIR = join(import.meta.dirname, '..', 'packages')
const dryRun = process.argv.includes('--dry-run')
const dirs = await readdir(PACKAGES_DIR, { withFileTypes: true })

// Build version map of all workspace packages
const versionMap = new Map<string, string>()
for (const dir of dirs.filter((d) => d.isDirectory())) {
  try {
    const pkg = JSON.parse(
      await readFile(join(PACKAGES_DIR, dir.name, 'package.json'), 'utf-8'),
    )
    if (pkg.name) versionMap.set(pkg.name, pkg.version)
  } catch {
    // skip directories without package.json
  }
}

/**
 * Replace workspace:* and workspace:^ with actual version ranges.
 */
function resolveWorkspaceDeps(
  deps: Record<string, string> | undefined,
): Record<string, string> | undefined {
  if (!deps) return deps
  const resolved = { ...deps }
  for (const [name, range] of Object.entries(resolved)) {
    if (range.startsWith('workspace:')) {
      const version = versionMap.get(name)
      if (!version) {
        console.error(`Cannot resolve workspace dependency: ${name}`)
        process.exit(1)
      }
      const prefix = range.replace('workspace:', '')
      resolved[name] = prefix === '*' ? version : `${prefix}${version}`
    }
  }
  return resolved
}

// Publish each package
for (const dir of dirs.filter((d) => d.isDirectory())) {
  const pkgPath = join(PACKAGES_DIR, dir.name, 'package.json')
  let raw: string
  try {
    raw = await readFile(pkgPath, 'utf-8')
  } catch {
    continue
  }

  const pkg = JSON.parse(raw)
  if (pkg.private || !pkg.name) continue

  // Check if already published
  const check = Bun.spawnSync(
    ['npm', 'view', `${pkg.name}@${pkg.version}`, 'version'],
    { stdout: 'pipe', stderr: 'pipe' },
  )
  if (check.stdout.toString().trim() === pkg.version) {
    console.log(`⏭️  ${pkg.name}@${pkg.version} — already published`)
    continue
  }

  console.log(`📦 ${pkg.name}@${pkg.version}`)

  // Resolve workspace deps before publishing
  const resolved = {
    ...pkg,
    dependencies: resolveWorkspaceDeps(pkg.dependencies),
    peerDependencies: resolveWorkspaceDeps(pkg.peerDependencies),
    devDependencies: undefined, // strip devDependencies from published package
  }
  await writeFile(pkgPath, `${JSON.stringify(resolved, null, 2)}\n`)

  try {
    const args = [
      'bunx',
      'npm',
      'publish',
      '--access',
      'public',
      '--provenance',
      '--ignore-scripts',
    ]
    if (dryRun) args.push('--dry-run')
    const result = Bun.spawnSync(args, {
      cwd: join(PACKAGES_DIR, dir.name),
      stdout: 'inherit',
      stderr: 'inherit',
    })
    if (result.exitCode !== 0) {
      console.error(`Failed to publish ${pkg.name}`)
      process.exit(1)
    }
  } finally {
    // Restore original package.json
    await writeFile(pkgPath, raw)
  }
}

console.log('\n✅ Done')
