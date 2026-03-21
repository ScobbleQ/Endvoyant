/**
 * @typedef {Object} WikiApiResponse
 * @property {string} itemId
 * @property {string} name
 * @property {string} lang
 * @property {Brief} brief
 * @property {number} status
 * @property {string[]} tagIds
 * @property {string} publishedAtTs
 * @property {Caption[]} caption
 */

/**
 * @typedef {Object} Brief
 * @property {string} cover
 * @property {string} name
 * @property {string | null} description
 * @property {Associated | null} associate
 * @property {SubType[]} subTypeList
 * @property {null} composite
 */

/**
 * @typedef {Object} Associated
 * @property {string} id
 * @property {string} name
 * @property {string} type
 * @property {string} dotType
 */

/**
 * @typedef {Object} SubType
 * @property {string} subTypeId
 * @property {string} value
 */

/**
 * @typedef {Object} Caption
 * @property {string} kind
 * @property {{ text: string }} text
 */

export {};
