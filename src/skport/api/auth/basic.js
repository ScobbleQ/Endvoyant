/**
 * Get OAuth token from SKPort via the app
 * @param {{ token: string }} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: { uid: string, email: string, name: string, avatar: string, isLatestUserAgreement: boolean } }>}
 * @example
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 *
 * const basic = await getBasic({ token: login.data.token });
 * console.dir(basic, { depth: null });
 */
export async function getBasic({ token }) {
  const url = `https://as.gryphline.com/user/info/v1/basic?token=${encodeURIComponent(token)}`;

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.status !== 0) {
      return { status: -1, msg: data.msg, timestamp: data.timestamp };
    }

    return { status: 0, data: data.data };
  } catch (error) {
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
