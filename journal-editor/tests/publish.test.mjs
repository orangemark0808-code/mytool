import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import * as core from '../editor-core.mjs';
import * as markdown from '../markdown.mjs';

test('actual publication step versions assets and preserves every module export', () => {
  const workflow = readFileSync(new URL('../../.github/workflows/deploy-prompt-stock.yml', import.meta.url), 'utf8').replace(/\r/g, '');
  const step = workflow.match(/      - name: Version Journal Editor assets\n        run: \|\n([\s\S]*?)(?=\n      - name: Setup Pages)/)[1];
  const shell = step.split('\n').map((line) => line.replace(/^          /, '')).join('\n');
  const code = shell.match(/node --input-type=module <<'NODE'\n([\s\S]*?)\nNODE/)[1].replace(/^import .*;\n/gm, '');
  const directory = 'dist/journal-editor';
  const files = new Map(['index.html', 'style.css', 'layout-overrides.css', 'script.js', 'editor-core.mjs', 'markdown.mjs'].map((file) => [path.join(directory, file), readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')]));
  const originalScript = files.get(path.join(directory, 'script.js'));
  const version = originalScript.match(/const VERSION = '([^']+)'/)[1];
  const file = (name) => { assert.ok(files.has(name), `Missing published file: ${name}`); return files.get(name); };
  const fs = {
    readFileSync: file,
    copyFileSync: (source, destination) => files.set(destination, file(source)),
    writeFileSync: (destination, text) => files.set(destination, text),
  };
  vm.runInNewContext(code, { fs, path });
  const html = file(path.join(directory, 'index.html'));
  for (const asset of [`style.${version}.css`, `layout-overrides.${version}.css`, `script.${version}.js`]) assert.ok(html.includes(asset));
  const script = file(path.join(directory, `script.${version}.js`));
  const namespaces = { 'editor-core': core, markdown };
  for (const match of script.matchAll(/import \{([^}]+)\} from '\.\/(editor-core|markdown)\.([0-9-]+)\.mjs';/g)) {
    assert.equal(match[3], version);
    const target = `${match[2]}.${match[3]}.mjs`;
    assert.equal(file(path.join(directory, target)), file(path.join(directory, `${match[2]}.mjs`)));
    for (const name of match[1].split(',').map((value) => value.trim())) assert.ok(name in namespaces[match[2]], `Missing export: ${name}`);
  }
  assert.ok(script.includes(`./editor-core.${version}.mjs`));
  assert.ok(script.includes(`./markdown.${version}.mjs`));
  assert.ok(html.includes('src="firebase-config.js"'));
  assert.ok(![...files.keys()].some((name) => name.includes('firebase-config')));
});
