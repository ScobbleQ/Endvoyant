import UserAgent from 'user-agents';
import { computeSign } from '#/skport/utils/computeSign.js';

/**
 * @typedef {Object} AttendanceResponse
 * @property {string} ts
 * @property {AwardIds[]} awardIds
 * @property {Object<string, ResourceItem>} resourceInfoMap
 */

/**
 * @typedef {Object} AwardIds
 * @property {string} id
 * @property {string} type
 */

/**
 * @typedef {Object} ResourceItem
 * @property {string} id
 * @property {number} count
 * @property {string} name
 * @property {string} icon
 */

/**
 * Submit attendance to the API
 * @param {{cred: string, token: string, uid: string, serverId: string}} param0
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: ResourceItem[] }>}
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, type: 0 });
 *
 * // Exchange the OAuth token for credentials
 * const cred = await generateCredByCode({ code: oauth.data.code });
 *
 * // Get the endfield binding
 * const binding = await getBinding({ cred: cred.data.cred, token: cred.data.token });
 *
 * // Get the endfield binding
 * const endfieldBinding = binding.data.find((binding) => binding.appCode === 'endfield');
 * const endfield = endfieldBinding.bindingList[0];
 *
 * const attendance = await attendance({
 *   cred: cred.data.cred,
 *   token: cred.data.token,
 *   uid: endfield.defaultRole.roleId,
 *   serverId: endfield.defaultRole.serverId,
 * });
 * console.dir(attendance, { depth: null });
 */
export async function attendance({ cred, token, uid, serverId }) {
  const url = 'https://zonai.skport.com/web/v1/game/endfield/attendance';

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Content-Length': '0',
    'Content-Type': 'application/json',
    cred: cred,
    Origin: 'https://game.skport.com',
    platform: '3',
    Pragma: 'no-cache',
    Priority: 'u=3, i',
    Referer: 'https://game.skport.com/',
    'sk-game-role': `3_${uid}_${serverId}`,
    'sk-language': 'en',
    'User-Agent': new UserAgent({ deviceCategory: 'desktop' }).toString(),
    vName: '1.0.0',
  };

  try {
    const ts = Math.floor(Date.now() / 1000).toString();

    const sign = computeSign({
      token: token,
      path: '/web/v1/game/endfield/attendance',
      body: '',
      timestamp: ts,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        sign: sign,
        timestamp: ts,
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      return { status: -1, msg };
    }

    const data = await res.json();
    if (data.code !== 0) {
      return { status: -1, msg: data.message };
    }

    const resourceItems = data.data.awardIds.map((/** @type {AwardIds} */ award) => {
      return data.data.resourceInfoMap[award.id];
    });

    return { status: 0, data: resourceItems };
  } catch (error) {
    return { status: -1, msg: /** @type {Error} */ (error).message };
  }
}
