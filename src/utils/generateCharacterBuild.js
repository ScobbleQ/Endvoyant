import { AttachmentBuilder } from 'discord.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';

/** @typedef {import('../skport/api/profile/cardDetail.js').Characters} Characters */
/** @typedef {import('../skport/api/profile/cardDetail.js').Weapon} Weapon */
/** @typedef {import('../skport/api/profile/cardDetail.js').UserSkillData} UserSkillData */
/** @typedef {import('../skport/api/profile/cardDetail.js').SkillData} SkillData */
/** @typedef {import('@napi-rs/canvas').SKRSContext2D} SKRSContext2D */

// --- Assets & layout ---
const BACKGROUND_URL = 'https://static.skport.com/asset/game/6ede1f8bf4dfc5797e283332401b222c.png';

const FONT_LG = 30;
const FONT_MD = 24;
const FONT_BASE = 20;
const FONT_SM = 16;
const FONT_XS = 14;

// --- Weapon section ---
const WEAPON_X = 600;
const WEAPON_Y = 50;
const WEAPON_SIZE = 160;
const WEAPON_CONTENT_GAP = 28;
const WEAPON_SKILL_BLOCK_H = 40;
const WEAPON_DASH_PILL_W = 10;
const WEAPON_DASH_PILL_H = 4;
const WEAPON_DASH_PILL_GAP = 6;
const WEAPON_DASH_COUNT = 9;

// --- Skill circles (character skills) ---
const SKILL_TYPE_ORDER = ['Basic Attack', 'Battle Skill', 'Combo skill', 'Ultimate'];

const SKILL_CIRCLE_R = 44;
const SKILL_SLOT_GAP = 20;
const SKILL_RING_W = 3;
const SKILL_RING_GAP = 6;
const SKILL_PILL_PAD_X = 10;
const SKILL_PILL_PAD_Y = 4;
const SKILL_PILL_Y_OFFSET = -4;

const SKILL_CIRCLE_BG = '#6e6e6e';
const SKILL_RING_COLOR = '#fcfcfc';
const SKILL_PILL_BG = '#989898';
const SKILL_PILL_TEXT = '#f5f5f5';

const SKILL_ELEMENT_COLOR = {
  Heat: 'FF623D',
  Electric: 'FFC000',
  Cryo: '21CDC0',
  Nature: 'ABBF00',
  Physical: '5F5F5F',
};

const TAU = Math.PI * 2;
const BOTTOM_SECTOR_ANGLE = (160 * Math.PI) / 180;
const BOTTOM_SECTOR_START = Math.PI / 2 - BOTTOM_SECTOR_ANGLE / 2;
const BOTTOM_SECTOR_END = Math.PI / 2 + BOTTOM_SECTOR_ANGLE / 2;

/**
 * @param {string} dcid
 * @param {Characters} c
 * @returns {Promise<AttachmentBuilder>}
 */
export async function generateCharacterBuild(dcid, c) {
  const canvas = createCanvas(1440, 600);
  const ctx = canvas.getContext('2d');

  await drawBackground(ctx);
  await drawPortrait(ctx, c.charData.illustrationUrl);

  ctx.font = '600 50px Geist';
  ctx.fillStyle = '#292929';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(c.charData.name, 10, 10);

  await drawWeapon(ctx, c.weapon);
  await drawSkills(ctx, c.userSkills, c.charData.skills);

  ctx.font = `400 ${FONT_BASE}px Geist`;
  ctx.fillStyle = '#666666';
  ctx.textAlign = 'end';
  ctx.textBaseline = 'bottom';
  ctx.fillText(
    'Various information are missing from SKPort API',
    ctx.canvas.width - 10,
    ctx.canvas.height - 10
  );
  ctx.fillText('This is a work in progress', ctx.canvas.width - 10, ctx.canvas.height - 30);

  return new AttachmentBuilder(await canvas.encode('jpeg'), {
    name: `${dcid}-${c.charData.id}.jpeg`,
  });
}

/** @param {SKRSContext2D} ctx */
async function drawBackground(ctx) {
  const bg = await loadImage(BACKGROUND_URL);
  ctx.drawImage(bg, 0, 0, ctx.canvas.width, ctx.canvas.height);
}

/**
 * Portrait in left 40%. Fades to transparent at right.
 * @param {SKRSContext2D} ctx
 * @param {string} imageUrl
 */
async function drawPortrait(ctx, imageUrl) {
  const { width: w, height: h } = ctx.canvas;
  const zoneW = Math.floor(w * 0.4);
  const zoneH = h;

  const image = await loadImage(imageUrl);
  const scale = (zoneW / image.width) * 1.4;
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  const dx = (zoneW - drawW) / 2;
  const dy = (zoneH - drawH) * 0.15;
  const fadeWidth = Math.floor(zoneW * 0.5);

  const layer = createCanvas(zoneW, zoneH);
  const lc = layer.getContext('2d');
  lc.drawImage(image, dx, dy, drawW, drawH);

  const gradient = lc.createLinearGradient(zoneW - fadeWidth, 0, zoneW, 0);
  gradient.addColorStop(0, 'rgba(0,0,0,0)');
  gradient.addColorStop(1, 'rgba(0,0,0,1)');
  lc.globalCompositeOperation = 'destination-out';
  lc.fillStyle = gradient;
  lc.fillRect(zoneW - fadeWidth, 0, fadeWidth, zoneH);

  ctx.drawImage(layer, 0, 0, zoneW, zoneH, 0, 0, zoneW, zoneH);
}

/**
 * Weapon icon, name, and passive skill lines.
 * @param {SKRSContext2D} ctx
 * @param {Weapon | null} weapon
 */
async function drawWeapon(ctx, weapon) {
  if (!weapon) return;

  ctx.save();

  const contentX = WEAPON_X + WEAPON_SIZE + WEAPON_CONTENT_GAP;
  const weaponImg = await loadImage(weapon.weaponData.iconUrl);

  ctx.drawImage(weaponImg, WEAPON_X, WEAPON_Y, WEAPON_SIZE, WEAPON_SIZE);

  ctx.font = `500 ${FONT_BASE}px Geist`;
  ctx.fillText(weapon.weaponData.name, contentX, WEAPON_Y + 20);

  const skillStartY = WEAPON_Y + 20 + 28 + 14;
  const { skills } = weapon.weaponData;

  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    const textY = skillStartY + WEAPON_SKILL_BLOCK_H * i;
    const dashY = textY + 24;

    ctx.save();
    ctx.font = `500 ${FONT_SM}px Geist`;
    ctx.fillText(skill.value, contentX, textY);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = '#888888';
    for (let j = 0; j < WEAPON_DASH_COUNT; j++) {
      const px = contentX + j * (WEAPON_DASH_PILL_W + WEAPON_DASH_PILL_GAP);
      ctx.beginPath();
      ctx.roundRect(px, dashY, WEAPON_DASH_PILL_W, WEAPON_DASH_PILL_H, WEAPON_DASH_PILL_H / 2);
      ctx.fill();
    }
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Character skill circles (Basic Attack, Battle Skill, etc.) with element overlay and rank pill.
 * @param {SKRSContext2D} ctx
 * @param {Record<string, UserSkillData>} userSkills
 * @param {SkillData[]} skills
 */
async function drawSkills(ctx, userSkills, skills) {
  const contentX = 950;
  const contentY = 200;
  const slotSize = SKILL_CIRCLE_R * 2 + SKILL_SLOT_GAP;
  const innerR = SKILL_CIRCLE_R - SKILL_RING_W;

  const typeOrderIndex = (/** @type {string} */ typeValue) => {
    const i = SKILL_TYPE_ORDER.indexOf(typeValue ?? '');
    return i === -1 ? 999 : i;
  };

  const entries = Object.values(userSkills)
    .map((skill) => ({ skill, skillInfo: skills.find((s) => s.id === skill.skillId) }))
    .filter(
      (/** @type {{ skill: UserSkillData, skillInfo: SkillData | undefined }} */ e) =>
        e.skillInfo != null
    )
    .sort(
      (a, b) =>
        typeOrderIndex(a.skillInfo?.type?.value ?? '') -
        typeOrderIndex(b.skillInfo?.type?.value ?? '')
    );

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const { skill, skillInfo } = entry;
    if (!skillInfo) continue;
    const cx = contentX + i * slotSize + SKILL_CIRCLE_R;
    const cy = contentY + SKILL_CIRCLE_R;

    const img = await loadImage(skillInfo.iconUrl);
    const isUltimate = skillInfo.type?.value === 'Ultimate';
    const element =
      /** @type {keyof typeof SKILL_ELEMENT_COLOR} */
      (skillInfo.property?.value ?? 'Physical');
    const overlayHex = SKILL_ELEMENT_COLOR[element] ?? SKILL_ELEMENT_COLOR.Physical;

    ctx.save();
    ctx.fillStyle = SKILL_CIRCLE_BG;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, TAU);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = `#${overlayHex}`;
    ctx.beginPath();
    if (isUltimate) {
      ctx.arc(cx, cy, innerR, 0, TAU);
    } else {
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, innerR, BOTTOM_SECTOR_START, BOTTOM_SECTOR_END);
      ctx.closePath();
    }
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, TAU);
    ctx.clip();
    ctx.drawImage(img, cx - innerR, cy - innerR, innerR * 2, innerR * 2);
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = SKILL_RING_COLOR;
    ctx.lineWidth = SKILL_RING_W;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR + SKILL_RING_GAP + SKILL_RING_W / 2, 0, TAU);
    ctx.stroke();
    ctx.restore();

    const rankText = `RANK ${skill.level}`;
    ctx.save();
    ctx.font = `600 ${FONT_XS}px Geist`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const pillW = ctx.measureText(rankText).width + SKILL_PILL_PAD_X * 2;
    const pillH = FONT_XS + SKILL_PILL_PAD_Y * 2;
    const pillX = cx - pillW / 2;
    const pillY = cy + innerR + SKILL_RING_GAP + SKILL_PILL_Y_OFFSET;
    ctx.fillStyle = SKILL_PILL_BG;
    ctx.beginPath();
    ctx.roundRect(pillX, pillY, pillW, pillH, pillH / 2);
    ctx.fill();
    ctx.fillStyle = SKILL_PILL_TEXT;
    ctx.fillText(rankText, cx, pillY + pillH / 2);
    ctx.restore();
  }
}
