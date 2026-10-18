import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
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
  'core-v14',
  'advanced-v14',
  'arcade-v14',
  'words-collection-v14',
  'party-v14',
  'lab-v14',
  'platform-v14',
];
const failures = [];
const logDirectory = new URL('../test-results/suites/', import.meta.url);
await mkdir(logDirectory, { recursive: true });
const requestedWorkers = Number(process.env.LAMMA_TEST_WORKERS || 2);
if (!Number.isInteger(requestedWorkers) || requestedWorkers < 1 || requestedWorkers > 4)
  throw new Error('LAMMA_TEST_WORKERS must be an integer from 1 to 4.');
let next = 0,
  completed = 0;
async function runSuite(name) {
  const started = Date.now();
  let output = '';
  const code = await new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [
        `tests/${name}.mjs`,
        ...(['arcade-v7', 'arcade-v8', 'arcade-v9'].includes(name) ? ['--built'] : []),
      ],
      {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          LAMMA_TEST_HTML:
            process.env.LAMMA_TEST_HTML ||
            fileURLToPath(new URL('../lamma_universe.html', import.meta.url)),
        },
      },
    );
    const collect = (chunk) => {
      output += chunk;
    };
    child.stdout.setEncoding('utf8').on('data', collect);
    child.stderr.setEncoding('utf8').on('data', collect);
    child.once('error', (error) => {
      output += error.stack + '\n';
      resolve(1);
    });
    child.once('close', (exitCode) => resolve(exitCode ?? 1));
  });
  await writeFile(new URL(`${name}.log`, logDirectory), output);
  completed++;
  console.log(
    `${code ? '✗' : '✓'} ${completed}/${suites.length} ${name} (${((Date.now() - started) / 1000).toFixed(1)}s)`,
  );
  if (code !== 0) {
    failures.push(name);
    console.error(output);
  }
}
await Promise.all(
  Array.from({ length: Math.min(requestedWorkers, suites.length) }, async () => {
    while (next < suites.length) await runSuite(suites[next++]);
  }),
);
console.log(
  `\n${suites.length - failures.length}/${suites.length} browser suites passed. Logs: test-results/suites/`,
);
if (failures.length) console.error(`Failed suites: ${failures.join(', ')}`);
process.exitCode = failures.length ? 1 : 0;
