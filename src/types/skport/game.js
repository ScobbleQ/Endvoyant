/**
 * @typedef {Object} Bulletin
 * @property {string} channel
 * @property {string} key
 * @property {string} lang
 * @property {{ cid: string, needPopup: boolean, needRedDot: boolean, version: number }[]} onlineList
 * @property {string} platform
 * @property {string} server
 * @property {string} subChannel
 * @property {string} topicCid
 * @property {number} type
 * @property {number} updatedAt
 * @property {string} version
 */

/**
 * @typedef {Object} BulletinDetail
 * @property {string} cid
 * @property {{ html: string, linkType: number }} data
 * @property {string} header
 * @property {number} startAt
 * @property {string} tab
 * @property {string} title
 * @property {number} type
 * @property {string} version
 */

/**
 * @typedef {Object} CachedBulletinEvent
 * @property {string} cid
 * @property {string} header
 * @property {string} html
 * @property {number} linkType
 * @property {string} title
 * @property {number} startAt
 * @property {string} version
 * @property {number} [onlineVersion]
 * @property {string} [topicCid]
 * @property {string} [topicKey]
 */

export {};
