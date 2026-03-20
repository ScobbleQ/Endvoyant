import logger from '#/logger';
import { computeSign } from '../../utils/computeSign.js';

/**
 *
 * @param {{ cred: string, token: string, hgId: string }} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: { token: string } }>}
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, type: 0 });
 *
 * // Exchange the OAuth token for credentials
 * const cred = await generateCredByCode({ code: oauth.data.code });
 *
 * const refreshToken = await refreshToken({ cred: cred.data.cred, token: cred.data.token });
 * console.dir(refreshToken, { depth: null });
 */
export const refreshToken = async ({ cred, token, hgId }) => {
  const url = 'https://zonai.skport.com/web/v1/auth/refresh';

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
    'Content-Type': 'application/json',
    Cookie: `acw_tc=_; HG_INFO_KEY={"hgId":"${hgId}"};`,
    Host: 'zonai.skport.com',
    'User-Agent':
      'skport-ios/1.0.0 (com.gryphline.skport; build:100000018; iOS 26.2.1) Alamofire/5.9.1',
    language: 'en-us',
    manufacturer: 'Apple',
    os: 'iOS',
    sign: computeSign({
      token: token,
      path: '/web/v1/auth/refresh',
      body: '{}',
      timestamp: Math.floor(Date.now() / 1000).toString(),
    }),
    timestamp: Math.floor(Date.now() / 1000).toString(),
    vCode: '100000018',
    vName: '1.0.0',
    cred: cred,
    platform: '3',
    'sk-language': 'en',
    Origin: 'https://game.skport.com',
    Referer: 'https://game.skport.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    Pragma: 'no-cache',
    Priority: 'u=3, i',
  };

  try {
    const res = await fetch(url, { method: 'GET', headers: headers });
    if (!res.ok) {
      logger.fatal(res, 'Line 59 of skport/api/auth/refreshToken.js');
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.code !== 0) {
      logger.fatal(data, 'Line 66 of skport/api/auth/refreshToken.js');
      return { status: -1, msg: data.msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    return { status: 0, data: data.data };
  } catch (error) {
    logger.fatal(error, 'Line 72 of skport/api/auth/refreshToken.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
};
