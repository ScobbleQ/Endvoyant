import UserAgent from 'user-agents';
import { computeSign } from '#/skport/utils/computeSign.js';

/**
 * @typedef {Object} PlayerBinding
 * @property {string} appCode
 * @property {string} appName
 * @property {boolean} supportMultiServer
 * @property {PlayerBindingList[]} bindingList
 */

/**
 * @typedef {Object} PlayerBindingList
 * @property {string} uid
 * @property {boolean} isOfficial
 * @property {boolean} isDefault
 * @property {string} channelMasterId
 * @property {string} channelName
 * @property {boolean} isDelete
 * @property {string} gameName
 * @property {number} gameId
 * @property {{ serverId: string, roleId: string, nickname: string, level: number, isDefault: boolean, isBanned: boolean, serverType: string, serverName: string }[]} roles
 * @property {{ serverId: string, roleId: string, nickname: string, level: number, isDefault: boolean, isBanned: boolean, serverType: string, serverName: string }} defaultRole
 */

/**
 * Get the binding list from the API
 * @param {{ cred: string, token: string }} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: PlayerBinding[] }>}
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '6eb76d4e13aa36e6' });
 *
 * // Exchange the OAuth token for credentials
 * const cred = await generateCredByCode({ code: oauth.data.code });
 *
 * const binding = await getBinding({ cred: cred.data.cred, token: cred.data.token });
 * console.dir(binding, { depth: null });
 */
export async function getBinding({ cred, token }) {
  const url = 'https://zonai.skport.com/api/v1/game/player/binding?';

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Content-Type': 'application/json',
    cred: cred,
    Origin: 'https://game.skport.com',
    platform: '3',
    Pragma: 'no-cache',
    Priority: 'u=3, i',
    Referer: 'https://game.skport.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'sk-language': 'en',
    'User-Agent': new UserAgent({ deviceCategory: 'desktop' }).toString(),
    vName: '1.0.0',
  };

  try {
    const ts = Math.floor(Date.now() / 1000).toString();

    const sign = computeSign({
      token: token,
      path: '/api/v1/game/player/binding',
      body: '',
      timestamp: ts,
    });

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        sign: sign,
        timestamp: ts,
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    return { status: 0, data: data.data.list };
  } catch (error) {
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
