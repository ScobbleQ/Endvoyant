/**
 * Generate credentials by code from SKPort via the website
 * @param {{ code: string }} param0
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: { cred: string, userId: string, token: string } }>}
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '6eb76d4e13aa36e6' });
 *
 * // Exchange the OAuth token for credentials
 * const cred = await generateCredByCode({ code: oauth.data.code });
 * console.dir(cred, { depth: null });
 */
export async function generateCredByCode({ code }) {
  const url = 'https://zonai.skport.com/web/v1/user/auth/generate_cred_by_code';

  const body = {
    kind: 1,
    code: code,
  };

  const headers = {
    Accept: 'application/json',
    'Content-Length': JSON.stringify(body).length.toString(),
    'Content-Type': 'application/json',
    Origin: 'https://www.skport.com',
    platform: '3',
    Referer: 'https://www.skport.com/',
    'sk-language': 'en',
    timestamp: Math.floor(Date.now() / 1000).toString(),
    vName: '1.0.0',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text();
      return { status: -1, msg };
    }

    const data = await res.json();
    if (data.code !== 0) {
      return { status: -1, msg: data.msg };
    }

    return { status: 0, data: data.data };
  } catch (error) {
    return { status: -1, msg: /** @type {Error} */ (error).message };
  }
}
