import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadScripts(files = ['src/Core.gs']) {
  const context = vm.createContext({ console, Date, JSON, Math, Number, String, Boolean, Array, Object, RegExp, Set, Map, Error, Intl });
  for (const file of files) {
    new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'), { filename: file }).runInContext(context);
  }
  return context;
}

export function grid(context, values, formulas) {
  return context.ssMakeGrid(values, formulas);
}
