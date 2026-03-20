import logger from '#/logger';

/**
 * @typedef { '6eb76d4e13aa36e6' | '3dacefa138426cfe' | 'd9f6dbb6bbd6bb33' | '973bd727dd11cbb6ead8' } AppCode
 */

const APP_TYPE = {
  '6eb76d4e13aa36e6': 0,
  d9f6dbb6bbd6bb33: 0,
  '973bd727dd11cbb6ead8': 0,
  '3dacefa138426cfe': 1,
};

/** @typedef {{ status: -1, msg: string, timestamp: string }} OAuthError */
/** @typedef {{ status: 0, data: { uid: string, code: string } }} OAuthType0 */
/** @typedef {{ status: 0, data: { token: string, hgId: string } }} OAuthType1 */

/**
 * Type 0 OAuth:
 * @typedef {'6eb76d4e13aa36e6' | 'd9f6dbb6bbd6bb33' | '973bd727dd11cbb6ead8'} AppCodeType0
 */

/**
 * Type 1 OAuth:
 * @typedef {'3dacefa138426cfe'} AppCodeType1
 */

/**
 * @overload
 * @param {{ token: string, appCode: AppCodeType0 }} params
 * @returns {Promise<OAuthType0 | OAuthError>}
 */

/**
 * @overload
 * @param {{ token: string, appCode: AppCodeType1 }} params
 * @returns {Promise<OAuthType1 | OAuthError>}
 */

/**
 * Get OAuth token from SKPort via the app
 * @param {{ token: string, appCode: AppCode }} param0
 * @returns {Promise<OAuthType0 | OAuthType1 | OAuthError>}
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 *
 * // Grant OAuth token
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '6eb76d4e13aa36e6' });
 * console.dir(oauth, { depth: null });
 */
export async function grantOAuth({ token, appCode }) {
  const url = 'https://as.gryphline.com/user/oauth2/v2/grant';

  const body = {
    appCode: appCode,
    token: token,
    type: APP_TYPE[appCode],
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Length': JSON.stringify(body).length.toString(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.fatal(res, 'Line 73 of skport/api/auth/grant.js');
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.status !== 0) {
      logger.fatal(data, 'Line 80 of skport/api/auth/grant.js');
      return { status: -1, msg: data.msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    return { status: 0, data: data.data };
  } catch (error) {
    logger.fatal(error, 'Line 86 of skport/api/auth/grant.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
