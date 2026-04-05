import UserAgent from 'user-agents';
import { langToWeb } from '#/constants/webLanguage.js';
import { computeSign } from '#/skport/utils/computeSign.js';
import logger from '#/logger';

/** @typedef {import('#/constants/languages.js').Language} Language */
/** @typedef {import('#/types/skport/profile.js').AwardIds} AwardIds */
/** @typedef {import('#/types/skport/profile.js').ResourceItem} ResourceItem */

/**
 * Submit attendance to the API
 * @param {{cred: string, token: string, uid: string, serverId: string, lang: Language}} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: ResourceItem[] }>}
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '6eb76d4e13aa36e6' });
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
export async function attendance({ cred, token, uid, serverId, lang = 'en' }) {
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
    'sk-language': langToWeb[lang],
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
      logger.fatal(res, 'Line 78 of skport/api/profile/attendance.js');
      const err = await res.json();
      return {
        status: -1,
        msg: err.message,
        timestamp: err.timestamp,
      };
    }

    const data = await res.json();
    if (data.code !== 0) {
      logger.fatal(data, 'Line 89 of skport/api/profile/attendance.js');
      return { status: -1, msg: data.message, timestamp: data.timestamp };
    }

    const resourceItems = data.data.awardIds.map((/** @type {AwardIds} */ award) => {
      return data.data.resourceInfoMap[award.id];
    });

    return { status: 0, data: resourceItems };
  } catch (error) {
    logger.fatal(error, 'Line 99 of skport/api/profile/attendance.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
