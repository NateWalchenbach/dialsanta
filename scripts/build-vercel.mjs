import { readdir, mkdir, copyFile, rm } from 'node:fs/promises';
import { extname, join } from 'node:path';

// Publish only website resources; translation sources and repository tooling stay private.
const excluded = new Set(['public', 'scripts', 'localization', 'node_modules']);
const extensions = new Set(['.html', '.css', '.js', '.xml', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.mp4', '.vtt', '.woff2', '.ttf']);
await rm('public', { recursive: true, force: true });
let count = 0;
async function copy(dir = '') {
  for (const entry of await readdir(dir || '.', { withFileTypes: true })) {
    if (entry.name.startsWith('.') || excluded.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await copy(path);
    else if (entry.isFile() && extensions.has(extname(entry.name))) {
      await mkdir(join('public', dir), { recursive: true });
      await copyFile(path, join('public', path));
      count++;
    }
  }
}
await copy();
console.log(`Published ${count} static website resources.`);
