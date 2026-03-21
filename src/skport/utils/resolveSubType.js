import * as Constants from './constants.js';
/** @typedef {import('#/types/skport/utils.js').ConstantValue} ConstantValue */
/** @typedef {import('#/types/skport/utils.js').ResolvedSubType} ResolvedSubType */

// prettier-ignore
export const TagTree = Object.freeze({
  "10000": Constants.Rarity,
  "10100": Constants.ElementType,
  "10200": Constants.Profession,
  "10213": Constants.WeaponType,
  "10219": Constants.Faction,
  "10207": Constants.WeaponType
});

/**
 * Resolves a single stat from subTypeId and value
 * @param {string} subTypeId - The subTypeId from API (e.g., '10000' for Rarity)
 * @param {string} value - The value from API (e.g., '10006' for 6*)
 * @returns {ResolvedSubType | null} The resolved constant value with category, or null if not found
 * @example
 * resolveSubType('10000', '10006') // Returns { category: 'rarity', id: '10006', name: '6*', value: 'rarity_6' }
 * resolveSubType('10100', '10105') // Returns { category: 'elementType', id: '10105', name: 'Physical', value: 'char_property_physical' }
 */
export function resolveSubType(subTypeId, value) {
  const category = TagTree[/** @type {keyof typeof TagTree} */ (subTypeId)];
  if (!category) return null;

  const constantValue = category[/** @type {keyof typeof category} */ (value)];
  if (!constantValue) return null;

  // Map subTypeId to category name
  // prettier-ignore
  /** @type {Record<string, string>} */
  const categoryMap = {
    "10000": 'rarity',
    "10100": 'elementType',
    "10200": 'profession',
    "10213": 'weaponType',
    "10219": 'faction',
    "10207": 'weaponType',
  };

  /** @type {ConstantValue} */
  const constant = constantValue;

  return Object.assign({ category: categoryMap[subTypeId] || subTypeId }, constant);
}
