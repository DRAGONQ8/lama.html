import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const scripts = [
  'core',
  'content',
  'platform',
  'advanced',
  'arcade',
  'words',
  'party',
  'lab',
  'experience',
  'upgrade',
  'playflow',
  'navigation',
  'boot',
];
const styles = [
  'styles',
  'advanced',
  'arcade',
  'words',
  'party',
  'lab',
  'experience',
  'upgrade',
  'playflow',
  'navigation',
  'site',
];
const read = (path) => readFile(resolve(root, path), 'utf8');
const normalizeArabic = (text) =>
  text
    .replace(/يديدة/g, 'جديدة')
    .replace(/يديد/g, 'جديد')
    .replace(/الياية/g, 'القادمة')
    .replace(/ياية/g, 'قادمة')
    .replace(/اللي بعدها/g, 'التالية')
    .replace(/اللي بعده/g, 'التالي');

const js = normalizeArabic(
  (await Promise.all(scripts.map((name) => read(`src/${name}.js`))))
    .map((code, i) => `// Source: src/${scripts[i]}.js\n${code}`)
    .join('\n'),
);
new vm.Script(js, { filename: 'lamma_universe.html' });
const css = (
  await Promise.all(
    styles.map((name) =>
      read(`src/${name}.css`).catch((error) => {
        if (error.code === 'ENOENT' && name !== 'styles') return '';
        throw error;
      }),
    ),
  )
).join('\n');
const html = normalizeArabic(
  (await read('src/template.html'))
    .replace('/* BUILD_STYLES */', () => css)
    .replace('/* BUILD_SCRIPTS */', () => js),
);
if (/<script[^>]+src=|<link[^>]+stylesheet|https?:\/\//i.test(html)) {
  throw new Error('Standalone output must not require external resources.');
}
for (const name of ['lamma_universe.html', 'index.html']) {
  if (process.argv.includes('--check')) {
    if ((await read(name)) !== html) throw new Error(`${name} is stale: run npm run build`);
  } else {
    await writeFile(resolve(root, name), html);
  }
}
console.log(`Lamma: standalone build verified (${Math.round(Buffer.byteLength(html) / 1024)} KB).`);
