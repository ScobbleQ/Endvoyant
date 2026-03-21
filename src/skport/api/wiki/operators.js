/** @typedef {import('#/types/skport/wiki.js').WikiApiResponse} WikiApiResponse */

/**
 * Get all operators from the API
 * @returns {Promise<WikiApiResponse[] | null>}
 * @example
 * const operators = await getOperators();
 * console.dir(operators, { depth: null });
 */
export async function getOperators() {
  const url = 'https://zonai.skport.com/web/v1/wiki/item/catalog?typeMainId=1&typeSubId=1';
  const res = await fetch(url);

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  if (data.code !== 0) {
    return null;
  }

  return data.data.catalog[0].typeSub[0].items;
}
