import { readFile, readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(fileURLToPath(new URL('..', import.meta.url)))
const sourceRoot = resolve(root, 'src')

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map(entry => entry.isDirectory()
    ? files(resolve(directory, entry.name))
    : [resolve(directory, entry.name)]))
  return nested.flat()
}

const sourceFiles = (await files(sourceRoot)).filter(path => ['.ts', '.tsx'].includes(extname(path)))
const forbidden = [
  [/\bdebugger\b/, 'debugger statement'],
  [/\beval\s*\(/, 'eval call'],
  [/dangerouslySetInnerHTML/, 'unsafe HTML injection'],
  [/console\.(log|debug)\s*\(/, 'debug console output'],
  [/TODO|FIXME|HACK/, 'unfinished marker'],
]
const failures = []
for (const path of sourceFiles) {
  const text = await readFile(path, 'utf8')
  for (const [pattern, label] of forbidden) {
    if (pattern.test(text)) failures.push(`${path}: ${label}`)
  }
}
if (failures.length) {
  console.error(failures.join('\n'))
  process.exitCode = 1
} else {
  console.log(`Frontend source contract lint passed (${sourceFiles.length} files checked).`)
}
