import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = ['appsscript.json','src/Core.gs','src/Server.gs','src/Sidebar.html','docs/CRITICAL_PATH.md','docs/FINAL_VERIFICATION_REPORT.md'];
const failures = required.filter(file => !fs.existsSync(path.join(root, file)));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8'));
const expectedScopes = new Set(['https://www.googleapis.com/auth/spreadsheets.currentonly','https://www.googleapis.com/auth/script.container.ui']);
const actualScopes = new Set(manifest.oauthScopes || []);
if (actualScopes.size !== expectedScopes.size || [...expectedScopes].some(scope => !actualScopes.has(scope))) failures.push('manifest OAuth scopes differ from approved set');
if (manifest.executionApi) failures.push('executionApi must not be externally exposed');
const nodeMajor = Number(process.versions.node.split('.')[0]);
if (nodeMajor < 20) failures.push('Node 20 or newer is required');
if (failures.length) { console.error('Doctor failed:\n- ' + failures.join('\n- ')); process.exit(1); }
console.log('Doctor: repository files, Node runtime, manifest scopes, and external execution boundary are healthy.');
