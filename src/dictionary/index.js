import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { lang as languageNames } from '#/constants/languages.js';

const FALLBACK_LANG = 'en-us';

const messages = Object.fromEntries(
  Object.keys(languageNames).map((code) => {
    const path = join(import.meta.dirname, 'locales', `${code}.json`);
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return [code, data];
  })
);

/**
 * @param {unknown} root
 * @param {string} path
 */
function getByPath(root, path) {
  const parts = path.split('.');
  let cur = root;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = /** @type {Record<string, unknown>} */ (cur)[p];
  }
  return cur;
}

/**
 * @param {string} key Dot path, e.g. `attendance.amount`
 * @param {import('#/constants/languages.js').Language} lang
 * @param {Record<string, string | number | boolean | null | undefined>} [params]
 * @returns {string}
 * @example
 * t('attendance.amount', 'en-us', { count: 5 }) // Amount: 5
 */
export const t = (key, lang, params) => {
  const locale = languageNames[lang] ? lang : FALLBACK_LANG;
  const fromLocale = getByPath(messages[locale], key);
  if (typeof fromLocale === 'string') return format(fromLocale, params);
  const fromFallback = getByPath(messages[FALLBACK_LANG], key);
  if (typeof fromFallback === 'string') return format(fromFallback, params);
  return key;
};

/**
 * @param {string} template
 * @param {Record<string, string | number | boolean | null | undefined>} [params]
 */
function format(template, params) {
  if (!params) return template;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_m, key) => {
    const v = params[key];
    return v == null ? '' : String(v);
  });
}
