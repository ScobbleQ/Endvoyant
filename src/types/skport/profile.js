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
 * @typedef {Object} PlayerBinding
 * @property {string} appCode
 * @property {string} appName
 * @property {boolean} supportMultiServer
 * @property {PlayerBindingList[]} bindingList
 */

/**
 * @typedef {Object} PlayerBindingList
 * @property {string} uid
 * @property {boolean} isOfficial
 * @property {boolean} isDefault
 * @property {string} channelMasterId
 * @property {string} channelName
 * @property {boolean} isDelete
 * @property {string} gameName
 * @property {number} gameId
 * @property {{ serverId: string, roleId: string, nickname: string, level: number, isDefault: boolean, isBanned: boolean, serverType: string, serverName: string }[]} roles
 * @property {{ serverId: string, roleId: string, nickname: string, level: number, isDefault: boolean, isBanned: boolean, serverType: string, serverName: string }} defaultRole
 */

/**
 * @typedef {Object} AccountBinding
 * @property {string} appCode
 * @property {string} appName
 * @property {boolean} supportMultiServer
 * @property {AccountBindingList[]} bindingList
 */

/**
 * @typedef {Object} AccountBindingList
 * @property {string} uid
 * @property {string} channelMasterId
 * @property {string} channelName
 * @property {boolean} isDelete
 * @property {boolean} isBanned
 * @property {number} registerTs
 * @property {{ isBind: boolean, serverId: string, serverName: string, roleId: string, nickName: string, level: number, isDefault: boolean, registerTs: number }[]} roles
 */

/**
 * @typedef {Object} AttendanceResponse
 * @property {string} ts
 * @property {AwardIds[]} awardIds
 * @property {Object<string, ResourceItem>} resourceInfoMap
 */

/**
 * @typedef {Object} AwardIds
 * @property {string} id
 * @property {string} type
 */

/**
 * @typedef {Object} ResourceItem
 * @property {string} id
 * @property {number} count
 * @property {string} name
 * @property {string} icon
 */

export {};
