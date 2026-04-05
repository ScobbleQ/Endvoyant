import { langToWeb } from '#/constants/webLanguage.js';
import { computeSign } from '#/skport/utils/computeSign.js';
import logger from '#/logger';
/** @typedef {import('#/types/skport/profile.js').CardDetail} CardDetail */

/**
 *
 * @param {{ serverId: string, roleId: string, cred: string, token: string, lang: import('#/constants/languages.js').Language }} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: CardDetail }>}
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
 * const endfield = binding.data.find((b) => b.appCode === 'endfield');
 * const roleInfo = endfield.bindingList[0].defaultRole;
 *
 * const card = await cardDetail({
 *   serverId: roleInfo.serverId,
 *   roleId: roleInfo.roleId,
 *   cred: cred.data.cred,
 *   token: cred.data.token,
 * });
 * console.dir(card, { depth: null });
 */
export async function cardDetail({ serverId, roleId, cred, token, lang = 'en-us' }) {
  const url = 'https://zonai.skport.com/api/v1/game/endfield/card/detail';

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'br;q=1.0, gzip;q=0.9, deflate;q=0.8',
    'Accept-Language': 'en-US,en;q=1.0',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'application/json',
    Host: 'zonai.skport.com',
    Origin: 'https://game.skport.com',
    Referer: 'https://game.skport.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Skport/0.7.0 (com.gryphline.skport; build:700089; Android 33; ) Okhttp/5.1.0',
    cred: cred,
    platform: '3',
    'sk-language': langToWeb[lang],
    vName: '1.0.0',
    priority: 'u=1, i',
    'sk-game-role': `3_${roleId}_${serverId}`,
  };

  try {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sign = computeSign({
      token: token,
      path: '/api/v1/game/endfield/card/detail',
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
      logger.fatal(res, 'Line 180 of skport/api/profile/cardDetail.js');
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.code !== 0) {
      logger.fatal(data, 'Line 187 of skport/api/profile/cardDetail.js');
      return { status: -1, msg: data.message, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    return { status: 0, data: data.data.detail };
  } catch (error) {
    logger.fatal(error, 'Line 193 of skport/api/profile/cardDetail.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
