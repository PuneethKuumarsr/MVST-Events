import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const build = spawnSync(process.execPath, [
  path.join(projectRoot, 'node_modules/vite/bin/vite.js'),
  'build', '--outDir', 'dist-cloudflare',
], {
  cwd: projectRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    VITE_PUBLIC_PORTAL_ORIGIN: 'https://mvst-seva.pages.dev',
    VITE_DEVELOPER_MODE: 'false',
  },
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

for (const [source, destination] of [
  ['worker.js', '_worker.js'],
  ['_routes.json', '_routes.json'],
  ['_headers', '_headers'],
]) {
  copyFileSync(path.join(projectRoot, 'cloudflare', source), path.join(projectRoot, 'dist-cloudflare', destination));
}
if (!existsSync(path.join(projectRoot, 'dist-cloudflare/index.html'))) {
  throw new Error('Cloudflare build did not produce an index.html');
}
console.log('MVST Cloudflare build ready: dist-cloudflare (https://mvst-seva.pages.dev)');
