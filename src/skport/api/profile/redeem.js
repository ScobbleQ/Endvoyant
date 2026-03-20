import logger from '#/logger';

/**
 *
 * @param {string} code
 * @param {{ channelId: string, serverId: string, token: string }} param1
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: { redeemResult: { recordId: string } } }>}
 */
export async function redeem(code, { channelId, serverId, token }) {
  const url = 'https://game-hub.gryphline.com/giftcode/api/redeem';

  const body = {
    channelId: channelId,
    code: code,
    confirm: false,
    platform: 'iOS',
    serverId: serverId,
    token: token,
  };

  const headers = {
    'Content-Length': JSON.stringify(body).length.toString(),
    Accept: 'application/json, text/plain, */*',
    Origin: 'https://ef-webview.gryphline.com',
    Host: 'game-hub.gryphline.com',
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HGWebIOS',
    'Content-Type': 'application/json',
    'Accept-Language': 'en-US,en;q=0.9',
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    Referer: 'https://ef-webview.gryphline.com/',
    Connection: 'keep-alive',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Encoding': 'gzip, deflate, br',
  };

  try {
    await fetch(url, { method: 'OPTIONS', headers: headers });

    const res = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      logger.fatal(res, 'Line 48 of skport/api/profile/redeem.js');
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.code !== 0) {
      logger.fatal(data, 'Line 55 of skport/api/profile/redeem.js');
      return { status: -1, msg: data.msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    // not sure how success structure is like, so we log to gather data
    logger.info(data);

    return { status: 0, data: data.data };
  } catch (error) {
    logger.fatal(error, 'Line 64 of skport/api/profile/redeem.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
