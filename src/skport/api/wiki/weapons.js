/** @typedef {import('#/types/skport/wiki.js').WikiApiResponse} WikiApiResponse */

/**
 * Get all weapons from the API
 * @returns {Promise<WikiApiResponse[] | null>}
 * @example
 * const weapons = await getWeapons();
 * console.dir(weapons, { depth: null });
 */
export async function getWeapons() {
  const url = 'https://zonai.skport.com/web/v1/wiki/item/catalog?typeMainId=1&typeSubId=2';
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
