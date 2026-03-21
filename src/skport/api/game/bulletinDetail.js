import logger from '#/logger';
/** @typedef {import('#/types/skport/game.js').BulletinDetail} BulletinDetail */

/**
 *
 * @param {string} bulletinId
 * @param {object} [options={}]
 * @param {import('../../../../dictionary/lang.js').Language} [options.lang='en-us']
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: BulletinDetail }>}
 */
export async function getBulletinDetail(bulletinId, { lang = 'en-us' } = {}) {
  const url = `https://game-hub.gryphline.com/bulletin/detail/${bulletinId}`;

  const params = {
    lang: lang,
    code: 'endfield_U35PW8',
  };

  const newUrl = `${url}?${new URLSearchParams(params).toString()}`;

  const headers = {
    'User-Agent':
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HGWebIOS',
    'Accept-Language': 'en-US,en;q=0.9',
    Connection: 'keep-alive',
    'Accept-Encoding': 'gzip, deflate, br',
    Accept: 'application/json, text/plain, */*',
    Referer: 'https://ef-webview.gryphline.com/',
    Origin: 'https://ef-webview.gryphline.com',
    Host: 'game-hub.gryphline.com',
  };

  try {
    const res = await fetch(newUrl, { headers });
    if (!res.ok) {
      logger.fatal(res, 'Line 35 of skport/api/game/bulletinDetail.js');
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    return { status: 0, data: data.data };
  } catch (error) {
    logger.fatal(error, 'Line 43 of skport/api/game/bulletinDetail.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
