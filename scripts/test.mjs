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
];
const failures = [];
for (const name of suites) {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [`tests/${name}.mjs`, ...(name === 'arcade-v7' ? ['--built'] : [])],
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
