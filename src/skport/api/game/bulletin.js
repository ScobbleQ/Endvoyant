import logger from '#/logger';
/** @typedef {import('#/types/skport/game.js').Bulletin} Bulletin */

/**
 * @param {object} [options={}]
 * @param {string} [options.serverId='3']
 * @param {string} [options.channelId='6']
 * @param {import('../../../../dictionary/lang.js').Language} [options.lang='en-us']
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: Bulletin }>}
 */
export async function getBulletin({ serverId = '3', channelId = '6', lang = 'en-us' } = {}) {
  const url = 'https://game-hub.gryphline.com/bulletin/v2/info';

  const params = {
    server: serverId,
    channel: channelId,
    lang: lang,
    code: 'endfield_U35PW8',
    platform: 'iOS',
    type: '0',
    subChannel: channelId,
  };

  const newUrl = `${url}?${new URLSearchParams(params).toString()}`;

  const headers = {
    Accept: '*/*',
    Host: 'game-hub.gryphline.com',
    Connection: 'keep-alive',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'User-Agent': 'Endfield/0 CFNetwork/3860.400.51 Darwin/25.3.0',
  };

  try {
    const res = await fetch(newUrl, { headers });
    if (!res.ok) {
      logger.fatal(res, 'Line 36 of skport/api/game/bulletin.js');
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    return { status: 0, data: data.data };
  } catch (error) {
    logger.fatal(error, 'Line 44 of skport/api/game/bulletin.js');
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
