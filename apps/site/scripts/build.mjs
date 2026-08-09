import { cp, mkdir, rm } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const repoRoot = resolve(siteRoot, '..', '..')
const webDist = resolve(repoRoot, 'apps', 'web', 'dist')
const output = resolve(siteRoot, 'dist')

await rm(output, { recursive: true, force: true })
await mkdir(resolve(output, 'server'), { recursive: true })
await mkdir(resolve(output, 'client'), { recursive: true })
await cp(webDist, resolve(output, 'client'), { recursive: true })
await cp(resolve(siteRoot, 'src', 'index.js'), resolve(output, 'server', 'index.js'))
console.log('Built the Sites worker and static client bundle.')
