/**
 * Get token by email and password from SKPort via the app
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: { token: string, hgId: string, email: string, isLatestUserAgreement: boolean } }>}
 * @example
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * console.dir(login, { depth: null });
 */
export async function tokenByEmailPassword(email, password) {
  const url = 'https://as.gryphline.com/user/auth/v1/token_by_email_password';

  const body = {
    email: email,
    from: 1,
    password: password,
  };

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
    'Content-Length': JSON.stringify(body).length.toString(),
    'Content-Type': 'application/json',
    Host: 'as.gryphline.com',
    'User-Agent': 'skport-ios/100000018 CFNetwork/3860.300.31 Darwin/25.2.0',
    'X-Captcha-Version': '4.0',
    'X-Language': 'en-us',
  };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.status !== 0) {
      return { status: -1, msg: data.msg, timestamp: data.timestamp };
    }

    // Maybe ask the user to complete the captcha if status is 1 (data.data.captcha is present)

    return { status: 0, data: data.data };
  } catch (error) {
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
