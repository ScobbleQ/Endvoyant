import UserAgent from 'user-agents';
import logger from '#/logger';

const ACCOUNT_TOKEN_PREFIX = 'ACCOUNT_TOKEN=';

/**
 * Extract and URL-decode ACCOUNT_TOKEN from Set-Cookie header strings.
 * @param {string[]} setCookies
 * @returns {string | null}
 */
function parseAccountTokenFromSetCookies(setCookies) {
  for (const cookie of setCookies) {
    if (!cookie.startsWith(ACCOUNT_TOKEN_PREFIX)) continue;
    const rest = cookie.slice(ACCOUNT_TOKEN_PREFIX.length);
    const value = rest.split(';')[0].trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}

/**
 * Get account token from the API
 * @param {string} accountToken
 * @param {string} skOAuthCredKey
 * @param {string} hgInfoKey
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: string }>}
 * @example
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 *
 * const accountToken = await accountToken(login.data.token);
 * console.dir(accountToken, { depth: null });
 */
export async function accountToken(accountToken, skOAuthCredKey, hgInfoKey) {
  const url = 'https://web-api.skport.com/cookie_store/account_token';

  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Cookie: `ACCOUNT_TOKEN=${accountToken}; SK_OAUTH_CRED_KEY=${skOAuthCredKey}; HG_INFO_KEY={"hgId":"${hgInfoKey}"};`,
    'Content-Type': 'application/json',
    Origin: 'https://www.skport.com',
    Pragma: 'no-cache',
    Priority: 'u=3, i',
    Referer: 'https://www.skport.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'User-Agent': new UserAgent({ deviceCategory: 'desktop' }).toString(),
    'x-language': 'en-us',
  };

  const requestData = {
    content: accountToken,
  };

  try {
    const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(requestData) });
    if (!res.ok) {
      logger.fatal(res, 'Line 65 of skport/api/auth/accountToken.js');
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.code !== 0) {
      logger.fatal(data, 'Line 72 of skport/api/auth/accountToken.js');
      return { status: -1, msg: data.msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const setCookies = res.headers.getSetCookie() || [];
    const token = parseAccountTokenFromSetCookies(setCookies);
    return { status: 0, data: token ?? '' };
  } catch (error) {
    logger.fatal(error, 'Line 80 of skport/api/auth/accountToken.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
