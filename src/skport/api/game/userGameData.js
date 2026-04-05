import { computeSign } from '#/skport/utils/computeSign.js';


/**
 * 
 * @param {*} param0 
 * @returns {Promise<{ status: -1, msg: string, timestamp: string } | { status: 0, data: serverId: string, roleId: string, gameLevel: string, userChars: {}[], userWeapons: {}[], userEquips: {}[], userTacticalItems: {}[], gender: string }>}
 */
export async function getUserGameData({ cred, token, uid, serverId }) {
  const url = 'https://zonai.skport.com/web/v1/game/endfield/team/user-game-data?';

  const ts = Math.floor(Date.now() / 1000).toString();
  const sign = computeSign({
    token: token,
    path: '/web/v1/game/endfield/team/user-game-data',
    body: '',
    timestamp: ts,
  });

  const headers = {
    Accept: '*/*',
    "Accept-Encoding": "gzip, deflate, br",
    "Accept-Language": "en-US,en;q=0.9",
    "Connection": "keep-alive",
    "Content-Type": "application/json",
    "Host": "zonai.skport.com",
    "Origin": "https://game.skport.com",
    Priority: "u=3, i",
    Referer: "https://game.skport.com/",
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 HGWebIOS",
    cred: cred,
    platform: "3",
    sign: sign,
    "sk-game-role": `3_${uid}_${serverId}`,
    timestamp: ts,
    vName: "1.0.0",
  }

  try {
    const res = await fetch(url, { method: 'GET', headers: headers });
    if (!res.ok) {
      const msg = await res.text();
      return { status: -1, msg: msg, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    const data = await res.json();
    if (data.code !== 0) {
      return { status: -1, msg: data.message, timestamp: Math.floor(Date.now() / 1000).toString() };
    }

    return { status: 0, data: data.data.userGameData };
  } catch (error) {
    return { status: -1, msg: error.message, timestamp: Math.floor(Date.now() / 1000).toString() };
  }
}