import { Accounts, Users } from '#/db/index.js';
import { generateCredByCode, grantOAuth } from '../api/auth/index.js';
import { cardDetail } from '../api/profile/index.js';
import { getOrCreateCache, getOrSet } from './cache.js';

/** @typedef {import('#/types/skport/profile.js').CardDetail} CardDetail */

const CARD_DETAIL_TTL = 30 * 60 * 1000; // 30 minutes
const cardDetailCache = getOrCreateCache('card-detail', CARD_DETAIL_TTL);

/**
 * @param {string} dcid - The Discord ID
 * @param {string | undefined} aid - The account ID
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: CardDetail }>}
 */
export async function getCachedCardDetail(dcid, aid) {
  const cacheKey = `card-${dcid}:${aid}`;
  return getOrSet(cardDetailCache, cacheKey, async () => {
    const user = await Users.getByDcid(dcid);
    if (!user) return { status: -1, msg: 'User not found' };

    const accounts = await Accounts.getByDcid(dcid);
    if (!accounts || accounts.length === 0) return { status: -1, msg: 'SKPort account not found' };

    const account = aid
      ? accounts.find((a) => a.id === aid)
      : (accounts.find((a) => a.isPrimary) ?? accounts[0]);
    if (!account) return { status: -1, msg: 'SKPort account not found' };

    const oauth = await grantOAuth({ token: account.accountToken, appCode: '6eb76d4e13aa36e6' });
    if (oauth.status !== 0) return { status: -1, msg: 'Failed to grant OAuth token' };

    const cred = await generateCredByCode({ code: oauth.data.code });
    if (cred.status !== 0) return { status: -1, msg: 'Failed to generate credentials' };

    const card = await cardDetail({
      serverId: account.serverId,
      roleId: account.roleId,
      cred: cred.data.cred,
      token: cred.data.token,
      lang: /** @type {import('#/constants/languages.js').Language} */ (user.lang),
    });

    if (card.status !== 0) {
      return { status: -1, msg: card.msg ?? 'Failed to get card detail' };
    }

    return { status: 0, data: card.data };
  });
}
