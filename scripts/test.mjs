import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const suites = [
  'smoke',
  'expansion',
  'reliability',
  'arcade-upgrade',
  'words-upgrade',
  'party-upgrade',
  'lab-upgrade',
  'core-upgrade',
  'advanced-v7',
  'arcade-v7',
  'words-v7',
  'party-v7',
  'lab-v7',
  'playflow-v7',
  'browser-v7',
  'core-v8',
  'advanced-v8',
  'arcade-v8',
  'words-v8',
  'party-v8',
  'lab-v8',
  'storage-v8',
  'navigation-v9',
  'core-v9',
  'advanced-v9',
  'arcade-v9',
  'words-v9',
  'party-v9',
  'lab-v9',
  'settings-v10',
  'solo-v10',
  'quality-v10',
  'gameplay-v10',
  'spy-v11',
  'party-v11',
  'collection-v11',
  'spy-v12',
  'core-v12',
  'reliability-v12-advanced',
  'reliability-v12-arcade',
  'lab-words-v12',
  'party-v12',
  'platform-v12',
  'core-v13',
  'arcade-v13',
  'words-lab-v13',
  'party-v13',
  'collection-v13',
  'platform-v13',
  'offline-v13',
  'accessibility-v13',
];
const failures = [];
for (const name of suites) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        `tests/${name}.mjs`,
        ...(['arcade-v7', 'arcade-v8', 'arcade-v9'].includes(name) ? ['--built'] : []),
      ],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          LAMMA_TEST_HTML:
            process.env.LAMMA_TEST_HTML ||
            fileURLToPath(new URL('../lamma_universe.html', import.meta.url)),
        },
      },
    );
    child.on('error', reject);
    child.on('exit', (exitCode) => resolve(exitCode ?? 1));
  });
  if (code !== 0) failures.push(name);
}
console.log(`\n${suites.length - failures.length}/${suites.length} browser suites passed.`);
if (failures.length) console.error(`Failed suites: ${failures.join(', ')}`);
process.exitCode = failures.length ? 1 : 0;
