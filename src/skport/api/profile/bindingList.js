import UserAgent from 'user-agents';

/**
 * @typedef {Object} AccountBinding
 * @property {string} appCode
 * @property {string} appName
 * @property {boolean} supportMultiServer
 * @property {AccountBindingList[]} bindingList
 */

/**
 * @typedef {Object} AccountBindingList
 * @property {string} uid
 * @property {string} channelMasterId
 * @property {string} channelName
 * @property {boolean} isDelete
 * @property {boolean} isBanned
 * @property {number} registerTs
 * @property {{ isBind: boolean, serverId: string, serverName: string, roleId: string, nickName: string, level: number, isDefault: boolean, registerTs: number }[]} roles
 */

/**
 *
 * @param {{ token: string }} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: AccountBinding[] }>}
 * @example
 * // Login and get OAuth token
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '3dacefa138426cfe' });
 *
 * // Pass OAuth token to get list of bindings
 * const bindings = await bindingList({ token: oauth.data.token });
 * console.dir(bindings, { depth: null });
 */
export async function bindingList({ token }) {
  const url = 'https://binding-api-account-prod.gryphline.com/account/binding/v1/binding_list';

  const params = {
    token,
    appCode: 'endfield',
  };

  const newUrl = `${url}?${new URLSearchParams(params).toString()}`;

  const headers = {
    Accept: 'application/json',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    'Cache-Control': 'no-cache',
    Origin: 'https://game.skport.com',
    Pragma: 'no-cache',
    Priority: 'u=3, i',
    Referer: 'https://game.skport.com/',
    'User-Agent': new UserAgent({ deviceCategory: 'desktop' }).toString(),
    'x-language': 'en-us',
  };

  try {
    const res = await fetch(newUrl, { headers });
    if (!res.ok) {
      const msg = (await res.text()) || 'Failed to get binding list. Please try again.';
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.status !== 0) {
      const msg = data.msg || 'Failed to get binding list. Please try again.';
      return { status: -1, msg, timestamp: data.timestamp };
    }

    return { status: 0, data: data.data.list };
  } catch (error) {
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
