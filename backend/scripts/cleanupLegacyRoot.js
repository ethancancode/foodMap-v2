import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

console.log('[Cleanup] Removing legacy root frontend files...');

const legacyPaths = [
  path.join(rootDir, 'src'),
  path.join(rootDir, 'index.html'),
  path.join(rootDir, 'vite.config.js'),
  path.join(rootDir, 'public'),
  path.join(rootDir, 'bun.lock'),
];

for (const p of legacyPaths) {
  try {
    if (fs.existsSync(p)) {
      const stats = fs.statSync(p);
      if (stats.isDirectory()) {
        fs.rmSync(p, { recursive: true, force: true });
        console.log(`[Cleanup] Removed directory: ${p}`);
      } else {
        fs.unlinkSync(p);
        console.log(`[Cleanup] Removed file: ${p}`);
      }
    }
  } catch (err) {
    console.warn(`[Cleanup] Warning on ${p}:`, err.message);
  }
}

console.log('[Cleanup] Legacy files removed successfully! All frontend code lives in /frontend.');
