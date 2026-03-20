import { computeSign } from '#/skport/utils/computeSign.js';

/**
 * @typedef {Object} CardDetail
 * @property {Base} base
 * @property {Characters[]} chars
 * @property {{ achieveMedals: { achievementData: {}, level: number, isPlated: boolean, obtainTs: string }[], display: { [key: string]: string }, count: number }} achieve
 * @property {{ rooms: { id: string, type: number, level: number, chars: [], reports: Record<string, { char: [], output: {}, createdTimeTs: string }> }[] }} spaceShip
 * @property {Domain[]} domain
 * @property {{ curStamina: string, maxTs: string, maxStamina: string }} dungeon
 * @property {{ curLevel: number, maxLevel: number }} bpSystem
 * @property {{ dailyActivation: number, maxDailyActivation: number }} dailyMission
 * @property {{ score: number, total: number }} weeklyMission
 * @property {{ charSwitch: boolean, charIds: string[] }} config
 * @property {string} currentTs
 */

/**
 * @typedef {Object} Base
 * @property {string} serverName
 * @property {string} roleId
 * @property {string} name
 * @property {string} createTime
 * @property {string} saveTime
 * @property {string} lastLoginTime
 * @property {number} exp
 * @property {number} level
 * @property {number} worldLevel
 * @property {number} gender
 * @property {string} avatarUrl
 * @property {{ id: string, description: string }} mainMission
 * @property {number} charNum
 * @property {number} weaponNum
 * @property {number} docNum
 */

/**
 * @typedef {Object} Characters
 * @property {CharacterData} charData
 * @property {string} id
 * @property {number} level
 * @property {Record<string, UserSkillData>} userSkills
 * @property {{ equipId: string, equipData: { id: string, name: string, iconUrl: string, rarity: { key: string, value: string }, type: { key: string, value: string }, level: { key: string, value: string }, properties: string[], isAccessory: boolean, suit: { id: string, name: string, skillId: string, skillDesc: string, skillDescParams: { [key: string]: string } }, function: string, pkg: string } } | null} bodyEquip
 * @property {{ equipId: string, equipData: { id: string, name: string, iconUrl: string, rarity: { key: string, value: string }, type: { key: string, value: string }, level: { key: string, value: string }, properties: string[], isAccessory: boolean, suit: { id: string, name: string, skillId: string, skillDesc: string, skillDescParams: { [key: string]: string } }, function: string, pkg: string } } | null} armEquip
 * @property {{ equipId: string, equipData: { id: string, name: string, iconUrl: string, rarity: { key: string, value: string }, type: { key: string, value: string }, level: { key: string, value: string }, properties: string[], isAccessory: boolean, suit: { id: string, name: string, skillId: string, skillDesc: string, skillDescParams: { [key: string]: string } }, function: string, pkg: string } } | null} firstAccessory
 * @property {{ equipId: string, equipData: { id: string, name: string, iconUrl: string, rarity: { key: string, value: string }, type: { key: string, value: string }, level: { key: string, value: string }, properties: string[], isAccessory: boolean, suit: { id: string, name: string, skillId: string, skillDesc: string, skillDescParams: { [key: string]: string } }, function: string, pkg: string } } | null} secondAccessory
 * @property {{ tacticalItemId: string, tacticalItemData: { id: string, name: string, iconUrl: string, rarity: { key: string, value: string }, activeEffectType: { key: string, value: string }, activeEffect: string, passiveEffect: string, activeEffectParams: { [key: string]: string }, passiveEffectParams: { [key: string]: string } } } | null} tacticalItem
 * @property {number} evolvePhase
 * @property {number} potentialLevel
 * @property {Weapon | null} weapon
 * @property {string} gender
 * @property {string} ownTs
 */

/**
 * @typedef {Object} Weapon
 * @property {{ id: string, name: string, iconUrl: string, rarity: { key: string, value: string }, type: { key: string, value: string }, function: string, description: string, skills: { key: string, value: string }[] }} weaponData
 * @property {number} level
 * @property {number} refineLevel
 * @property {number} breakthroughLevel
 * @property {null} gem
 */

/**
 * @typedef {Object} CharacterData
 * @property {string} id
 * @property {string} name
 * @property {string} avatarSqUrl
 * @property {string} avatarRtUrl
 * @property {{ key: string, value: string }} rarity
 * @property {{ key: string, value: string }} profession
 * @property {{ key: string, value: string }} property
 * @property {{ key: string, value: string }} weaponType
 * @property {SkillData[]} skills
 * @property {string} illustrationUrl
 * @property {string[]} tags
 */

/**
 * @typedef {Object} UserSkillData
 * @property {string} skillId
 * @property {number} level
 * @property {number} maxLevel
 */

/**
 * @typedef {Object} SkillData
 * @property {string} id
 * @property {string} name
 * @property {{ key: string, value: string }} type
 * @property {{ key: string, value: string }} property
 * @property {string} iconUrl
 * @property {string} desc
 * @property {{ [key: string]: string } | {}} descParams
 * @property {Record<string, { level: string, params: { [key: string]: string } }>} descLevelParams
 */

/**
 * @typedef {Object} Domain
 * @property {string} domainId
 * @property {number} level
 * @property {{ id: string, level: number, exp: string, expToLevelUp: string, remainMoney: string, moneyMax: string, officerCharIds: string, officerCharAvatar: string, name: string, lastTickTime: string }[]} settlements
 * @property {{ total: string, count: string }} moneyMgr
 * @property {{ levelId: string, puzzleCount: number, trchestCount: number, equipTrchestCount: number, pieceCount: number, blackboxCount: number }[]} collections
 * @property {{ levelId: string, name: string, puzzleCount: { count: number, total: number }, trchestCount: { count: number, total: number }, equipTrchestCount: { count: number, total: number }, pieceCount: { count: number, total: number }, blackboxCount: { count: number, total: number } }[]} levels
 * @property {null} factory
 * @property {string} name
 */

/**
 *
 * @param {{ serverId: string, roleId: string, cred: string, token: string }} param0
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: CardDetail }>}
 * @example
 * // Login with email and password
 * const login = await tokenByEmailPassword('test@example.com', 'password');
 * const oauth = await grantOAuth({ token: login.data.token, appCode: '6eb76d4e13aa36e6' });
 *
 * // Exchange the OAuth token for credentials
 * const cred = await generateCredByCode({ code: oauth.data.code });
 *
 * // Get the endfield binding
 * const binding = await getBinding({ cred: cred.data.cred, token: cred.data.token });
 * const endfield = binding.data.find((b) => b.appCode === 'endfield');
 * const roleInfo = endfield.bindingList[0].defaultRole;
 *
 * const card = await cardDetail({
 *   serverId: roleInfo.serverId,
 *   roleId: roleInfo.roleId,
 *   cred: cred.data.cred,
 *   token: cred.data.token,
 * });
 * console.dir(card, { depth: null });
 */
export async function cardDetail({ serverId, roleId, cred, token }) {
  const url = 'https://zonai.skport.com/api/v1/game/endfield/card/detail';

  const headers = {
    Accept: '*/*',
    'Accept-Encoding': 'br;q=1.0, gzip;q=0.9, deflate;q=0.8',
    'Accept-Language': 'en-US,en;q=1.0',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Content-Type': 'application/json',
    Host: 'zonai.skport.com',
    Origin: 'https://game.skport.com',
    Referer: 'https://game.skport.com/',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-site',
    'User-Agent': 'Skport/0.7.0 (com.gryphline.skport; build:700089; Android 33; ) Okhttp/5.1.0',
    cred: cred,
    platform: '3',
    'sk-language': 'en',
    vName: '1.0.0',
    priority: 'u=1, i',
    'sk-game-role': `3_${roleId}_${serverId}`,
  };

  try {
    const ts = Math.floor(Date.now() / 1000).toString();
    const sign = computeSign({
      token: token,
      path: '/api/v1/game/endfield/card/detail',
      body: '',
      timestamp: ts,
    });

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        ...headers,
        sign: sign,
        timestamp: ts,
      },
    });

    if (!res.ok) {
      const msg = await res.text();
      return { status: -1, msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.code !== 0) {
      return { status: -1, msg: data.message, timestamp: data.timestamp };
    }

    return { status: 0, data: data.data.detail };
  } catch (error) {
    return {
      status: -1,
      msg: /** @type {Error} */ (error).message,
      timestamp: Math.floor(Date.now() / 1000).toString(),
    };
  }
}
