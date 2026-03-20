/**
 * Generate U8 token by channel token via the Game
 * @param {{ channelId: string, channelToken: string }} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: { token: string, isNew: boolean, uid: string } }>}
 * @example
 * const token = await tokenByChannelToken({ channelId: '6', channelToken: '1234567890' });
 * console.dir(token, { depth: null });
 */
export async function tokenByChannelToken({ channelId, channelToken }) {
  const url = 'https://u8.gryphline.com/u8/user/auth/v2/token_by_channel_token';

  const body = {
    appCode: '973bd727dd11cbb6ead8',
    channelMasterId: channelId,
    channelToken: JSON.stringify({
      type: 1,
      isSuc: true,
      code: channelToken,
    }),
    platform: 0,
    type: 0,
  };

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
    'Content-Length': JSON.stringify(body).length.toString(),
    'Content-Type': 'application/json',
    Host: 'u8.gryphline.com',
    'User-Agent': 'Endfield/0 CFNetwork/3860.400.51 Darwin/25.3.0',
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

    return { status: 0, data: data.data };
  } catch (error) {
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
