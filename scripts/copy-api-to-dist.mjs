import { mkdir, copyFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const sourceDir = path.join(root, 'api');
const targetDir = path.join(root, 'dist', 'api');

async function ensureDir(dir) {
  await mkdir(dir, { recursive: true });
}

async function copyDir(source, target) {
  await ensureDir(target);
  const entries = await readdir(source);

  for (const entry of entries) {
    const sourcePath = path.join(source, entry);
    const targetPath = path.join(target, entry);
    const entryStat = await stat(sourcePath);

    if (entryStat.isDirectory()) {
      await copyDir(sourcePath, targetPath);
      continue;
    }

    if (entry === 'config.php') {
      continue;
    }

    await copyFile(sourcePath, targetPath);
  }
}

await copyDir(sourceDir, targetDir);
console.log('Copied api files to dist/api (excluding config.php)');
