import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['src/Core.gs', 'src/Server.gs'];
for (const relative of files) {
  const code = fs.readFileSync(path.join(root, relative), 'utf8');
  new vm.Script(code, { filename: relative });
}
const html = fs.readFileSync(path.join(root, 'src/Sidebar.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/i);
if (!script) throw new Error('Sidebar.html has no client script.');
new vm.Script(script[1], { filename: 'src/Sidebar.html#script' });

const server = fs.readFileSync(path.join(root, 'src/Server.gs'), 'utf8');
const rpcFunctions = [...html.matchAll(/\.([A-Za-z][A-Za-z0-9_]*)\(/g)]
  .map(match => match[1])
  .filter(name => ['getBootstrap','setLanguage','acknowledgeOnboarding','previewOperation','previewCsvImport','applyOperation','applyCsvImport','undoOperation','analyzeCurrentTarget','getOperationHistory','exportCurrentRangeCsv','savePreset','listPresets','deletePreset','setMutationPause','exportSupportBundle','deleteMySheetShaperData'].includes(name));
for (const functionName of new Set(rpcFunctions)) {
  if (!new RegExp(`function\\s+${functionName}\\s*\\(`).test(server)) throw new Error(`Sidebar calls missing server function ${functionName}.`);
}
const production = files.concat(['src/Sidebar.html']).map(relative => fs.readFileSync(path.join(root, relative), 'utf8')).join('\n');
for (const forbidden of [/coming soon/i, /not implemented/i, /placeholder\s*(?:-|:|functionality)/i, /UrlFetchApp/, /DriveApp/, /GmailApp/, /MailApp/]) {
  if (forbidden.test(production)) throw new Error(`Forbidden production marker/service found: ${forbidden}`);
}
JSON.parse(fs.readFileSync(path.join(root, 'appsscript.json'), 'utf8'));
console.log(`Syntax and UI contract lint passed (${rpcFunctions.length} RPC call sites checked).`);
