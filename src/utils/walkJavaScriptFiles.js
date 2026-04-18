import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Recursively collect JavaScript files from a directory.
 * @param {string} directory
 * @returns {string[]}
 */
export function walkJavaScriptFiles(directory) {
  /** @type {string[]} */
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkJavaScriptFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

/**
 * Collect Discord slash-command entry modules: only files named `index.js`, skipping
 * directories whose names start with `_` (e.g. `_components`, `_shared`).
 * @param {string} directory
 * @returns {string[]}
 */
export function walkCommandEntryFiles(directory) {
  /** @type {string[]} */
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('_')) {
      continue;
    }

    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkCommandEntryFiles(fullPath));
      continue;
    }

    if (entry.isFile() && entry.name === 'index.js') {
      files.push(fullPath);
    }
  }

  return files.sort();
}
