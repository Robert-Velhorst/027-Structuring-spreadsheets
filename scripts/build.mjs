import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'src');
const output = path.join(root, 'dist');
if (!output.startsWith(root + path.sep)) throw new Error('Refusing to build outside the repository.');

await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
for (const file of ['Core.gs', 'Server.gs', 'Sidebar.html']) {
  await fs.copyFile(path.join(source, file), path.join(output, file));
}
await fs.copyFile(path.join(root, 'appsscript.json'), path.join(output, 'appsscript.json'));
console.log('Built dist/ with 2 script files, 1 sidebar, and the least-privilege manifest.');
