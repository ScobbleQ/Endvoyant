import { getBulletin, getBulletinDetail } from '#/skport/api/index.js';
import { getOrCreateCache, getOrSet } from './cache.js';

/** @typedef {import('#/types/skport/game.js').Bulletin} Bulletin */
/** @typedef {import('#/types/skport/game.js').BulletinDetail} BulletinDetail */
/** @typedef {import('#/types/skport/game.js').CachedBulletinEvent} CachedBulletinEvent */

const EVENTS_TTL = 1 * 60 * 60 * 1000; // 1 hour
const eventsCache = getOrCreateCache('events', EVENTS_TTL);
const eventDetailCache = getOrCreateCache('event-detail', EVENTS_TTL);
const eventsEnrichedCache = getOrCreateCache('events-enriched', EVENTS_TTL);

/**
 * @param {Bulletin['onlineList'][number]} online
 * @param {BulletinDetail} detail
 * @param {{ topicCid?: string, topicKey?: string }} topic
 * @returns {CachedBulletinEvent}
 */
function toCachedBulletinEvent(online, detail, topic) {
  return {
    cid: detail.cid,
    header: detail.header,
    html: detail.data.html,
    linkType: detail.data.linkType,
    title: detail.title,
    startAt: detail.startAt,
    version: detail.version,
    onlineVersion: online.version,
    topicCid: topic.topicCid,
    topicKey: topic.topicKey,
  };
}

/**
 * @param {import('../../../dictionary/lang.js').Language} [lang='en-us']
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: Bulletin }>}
 */
export async function getCachedEvents(lang = 'en-us') {
  const cacheKey = `events:${lang}`;
  return getOrSet(eventsCache, cacheKey, async () => {
    const bulletin = await getBulletin({ lang });
    if (!bulletin || bulletin.status !== 0) {
      return { status: -1, msg: bulletin?.msg ?? 'Failed to load events' };
    }

    const events = bulletin.data;
    return { status: 0, data: events };
  });
}

/**
 * @param {string} bulletinId - Usually the list item `cid`
 * @param {import('../../../dictionary/lang.js').Language} [lang='en-us']
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: BulletinDetail }>}
 */
export async function getCachedEventDetail(bulletinId, lang = 'en-us') {
  const cacheKey = `${bulletinId}:${lang}`;
  return getOrSet(eventDetailCache, cacheKey, async () => {
    const detail = await getBulletinDetail(bulletinId, { lang });
    if (!detail || detail.status !== 0) {
      return { status: -1, msg: detail?.msg ?? 'Failed to load event detail' };
    }
    return { status: 0, data: detail.data };
  });
}

/**
 * Single bulletin (`onlineList[].cid`) plus per-cid detail, merged and cached as one payload.
 * Detail fetches reuse `getCachedEventDetail` (per-cid cache).
 *
 * @param {import('../../../dictionary/lang.js').Language} [lang='en-us']
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: CachedBulletinEvent[], byCid: Record<string, CachedBulletinEvent> }>}
 */
export async function getCachedEnrichedEvents(lang = 'en-us') {
  const cacheKey = `enriched:${lang}`;
  return getOrSet(eventsEnrichedCache, cacheKey, async () => {
    const bulletin = await getBulletin({ lang });
    if (!bulletin || bulletin.status !== 0) {
      return { status: -1, msg: bulletin?.msg ?? 'Failed to load events' };
    }

    /** @type {Bulletin | undefined} */
    const topic = bulletin.data;
    if (!topic) {
      return { status: -1, msg: 'Invalid bulletin payload' };
    }

    const topicMeta = { topicCid: topic.topicCid, topicKey: topic.key };
    const seen = new Set();

    /** @type {Promise<CachedBulletinEvent | null>[]} */
    const tasks = [];

    for (const online of topic.onlineList ?? []) {
      if (seen.has(online.cid)) continue;
      seen.add(online.cid);
      tasks.push(
        getCachedEventDetail(online.cid, lang).then((res) => {
          if (!res || res.status !== 0 || !res.data) return null;
          return toCachedBulletinEvent(online, res.data, topicMeta);
        })
      );
    }

    const merged = (await Promise.all(tasks)).filter(
      /** @returns {row is CachedBulletinEvent} */
      (row) => row != null && row.header !== ''
    );

    /** @type {Record<string, CachedBulletinEvent>} */
    const byCid = {};
    for (const row of merged) {
      byCid[row.cid] = row;
    }

    return { status: 0, data: merged, byCid };
  });
}
