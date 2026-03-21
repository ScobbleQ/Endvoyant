import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { errorContainer } from '#/components/index.js';
import {
  getProfessionEmoji,
  getPropertyEmoji,
  RarityEmoji,
  Rarity2Emoji,
} from '#/constants/emojis.js';
import { ElementType, Profession } from '#/constants/skport.js';
import { Accounts, Events } from '#/db/index.js';
import { getCachedCardDetail } from '#/skport/utils/getCachedCardDetail.js';
import { createComponentId } from '#/utils/componentId.js';
import { getMaxLevel, getBreakthroughLevel } from '#/utils/game.js';
import { generateCharacterBuild } from '#/utils/generateCharacterBuild.js';
import { BotConfig } from '#/config';

/** @typedef {import('#/types/skport/profile.js').Characters} Characters */

const CHARS_PER_PAGE = 5;
const INITIAL_STATE = {
  page: 0,
  profession: 'all',
  element: 'all',
  rarity: 'all',
  shortId: 0,
};

const characterButtonInteractions = {
  catalog: { ownerOnly: true, execute: showCharactersCatalog },
  view: { ownerOnly: true, execute: showCharacterDetail },
  page: { ownerOnly: true, execute: showCharactersPage },
  rarity: { ownerOnly: true, execute: filterCharactersByRarity },
  image: { ownerOnly: true, execute: generateCharacterImage },
};

const characterSelectMenuInteractions = {
  filter: { ownerOnly: true, execute: filterCharactersSelectMenu },
};

/** @param {{ page: number, profession: string, element: string, rarity: string, shortId?: number }} state */
const toStateStr = (state) =>
  `${state.page}:${state.profession}:${state.element}:${state.rarity}:${state.shortId ?? 0}`;

const notFoundImage = new AttachmentBuilder('assets/images/pensive.png');

/** @param {import('discord.js').MessageComponentInteraction} interaction @param {{ msg?: string } | null} result */
const charactersErrorReply = (interaction, result) =>
  interaction.editReply({
    components: [errorContainer(result?.msg || 'Failed to load characters')],
  });

/** @param {Characters} c */
const getProfessionName = (c) => c.charData.profession.value;

/** @param {Characters} c */
const getElementName = (c) => c.charData.property.value;

/**
 * Substitute tactical effect placeholders with actual param values.
 * Placeholders: <@ba.vup>{paramName:format}</> where format is "0" (raw) or "0%" (as percentage).
 * Also strips <@tips.xxx>...</> to plain text.
 * @param {string} text
 * @param {Record<string, string>} params
 */
const substituteTacticalParams = (text, params) => {
  if (!text || typeof text !== 'string') return '';
  let out = text;

  // Replace <@ba.vup>{key:format}</> with bold param value
  out = out.replace(/<@ba\.vup>\{(\w+):([^}]*)\}<\/>/g, (_, key, format) => {
    const raw = params?.[key];
    if (raw === undefined || raw === null) return raw ?? '';
    const formatStr = (format || '').trim();
    let value;
    if (formatStr.includes('%')) {
      const num = parseFloat(raw);
      value = Number.isNaN(num) ? raw : `${Math.round(num * 100)}%`;
    } else {
      value = String(raw);
    }
    return `**${value}**`;
  });

  // Strip all " - <@tips.xxx>...</>" (bullet + tag and content)
  out = out.replace(/\n?\s*-\s*<@tips\.\w+>.*?<\/>/gs, '').replace(/\s{2,}/g, ' ');
  return out.trim();
};

/**
 * @param {string} dcid
 * @param {string} [aid] - Account ID; if omitted, uses primary/first
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: Characters[] }>}
 */
const getCharacters = async (dcid, aid) => {
  const result = await getCachedCardDetail(dcid, aid);
  if (result.status !== 0) return result;
  return { status: 0, data: result.data.chars };
};

/**
 * @param {Array<{ id: string, shortId: number, isPrimary: boolean }>} accounts
 * @param {string | null} targetShortId
 */
const resolveAccount = (accounts, targetShortId) =>
  targetShortId
    ? accounts.find((a) => String(a.shortId) === targetShortId)
    : (accounts.find((a) => a.isPrimary) ?? accounts[0]);

/** @param {{ msg?: string, status?: number } | null} result */
const parseErrorMsg = (result) => {
  let code = -1;
  let msg = result?.msg ?? 'Unknown error';
  try {
    const parsed = JSON.parse(result?.msg ?? '{}');
    code = parsed.code ?? result?.status ?? -1;
    msg = parsed.message ?? msg;
  } catch {
    /* plain string */
  }
  return { code, msg };
};

/** @param {string} stateStr */
const parseState = (stateStr) => {
  const parts = stateStr.split(':');
  const [page = '0', profession = 'all', element = 'all', rarity = 'all', shortIdStr = '0'] = parts;
  const shortId = parseInt(shortIdStr, 10) || 0;
  return {
    page: Math.max(0, parseInt(page, 10) || 0),
    profession,
    element,
    rarity,
    shortId,
  };
};

/**
 * @param {Characters} char
 * @param {string} profession
 */
const matchesProfession = (char, profession) => {
  if (profession === 'all') return true;
  const p = char.charData.profession;
  if (!p) return false;
  const entry = Object.values(Profession).find((e) => e.value === profession);
  return p.value === profession || p.key === profession || (entry && p.key === entry.id) || false;
};

/**
 * @param {Characters} char
 * @param {string} element
 */
const matchesElement = (char, element) => {
  if (element === 'all') return true;
  const prop = char.charData.property;
  if (!prop) return false;
  const entry = Object.values(ElementType).find((e) => e.value === element);
  return (
    prop.value === element || prop.key === element || (entry && prop.key === entry.id) || false
  );
};

/**
 * @param {Characters} char
 * @param {string} rarity
 */
const matchesRarity = (char, rarity) => {
  if (rarity === 'all') return true;
  const value = Number(char.charData.rarity?.value ?? 0);
  const target = Number(rarity);
  if (!target) return true;
  return value === target;
};

/**
 * @param {Characters[]} chars
 * @param {{ page: number, profession: string, element: string, rarity: string, shortId?: number }} state
 */
const buildCatalogContainer = (chars, { page, profession, element, rarity, shortId }) => {
  const sid = shortId ?? 0;
  const filtered = chars.filter(
    (c) =>
      matchesProfession(c, profession) && matchesElement(c, element) && matchesRarity(c, rarity)
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / CHARS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageChars = filtered.slice(
    clampedPage * CHARS_PER_PAGE,
    (clampedPage + 1) * CHARS_PER_PAGE
  );
  const stateStr = toStateStr({ page: clampedPage, profession, element, rarity, shortId: sid });

  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('## ▼// Owned Operators')
  );

  container.addActionRowComponents((actionRow) =>
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(createComponentId('characters', 'rarity', '*', stateStr))
        .setLabel('✦')
        .setStyle(rarity === 'all' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(createComponentId('characters', 'rarity', '4', stateStr))
        .setLabel('4 ✦')
        .setStyle(rarity === '4' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(createComponentId('characters', 'rarity', '5', stateStr))
        .setLabel('5 ✦')
        .setStyle(rarity === '5' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(createComponentId('characters', 'rarity', '6', stateStr))
        .setLabel('6 ✦')
        .setStyle(rarity === '6' ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );

  container.addActionRowComponents((actionRow) =>
    actionRow.setComponents(
      new StringSelectMenuBuilder()
        .setCustomId(createComponentId('characters', 'filter', 'opclass', stateStr))
        .setPlaceholder('Filter by profession')
        .addOptions(
          {
            label: 'All Professions',
            value: 'all',
            emoji: '<:chevronalldirections:1482936485719310482>',
          },
          ...Object.values(Profession).map((p) => ({
            emoji: getProfessionEmoji(p.name),
            label: p.name,
            value: p.value,
            default: p.value === profession,
          }))
        )
    )
  );

  container.addActionRowComponents((actionRow) =>
    actionRow.setComponents(
      new StringSelectMenuBuilder()
        .setCustomId(createComponentId('characters', 'filter', 'element', stateStr))
        .setPlaceholder('Filter by element')
        .addOptions(
          {
            label: 'All Elements',
            value: 'all',
            emoji: '<:chevronalldirections:1482936485719310482>',
          },
          ...Object.values(ElementType).map((e) => ({
            emoji: getPropertyEmoji(e.name),
            label: e.name,
            value: e.value,
            default: e.value === element,
          }))
        )
    )
  );

  container.addSeparatorComponents((separator) => separator);

  if (pageChars.length === 0) {
    container
      .addMediaGalleryComponents((mediaGallery) =>
        mediaGallery.addItems({
          media: {
            url: 'attachment://pensive.png',
          },
        })
      )
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent('## No matching operators found')
      );
  } else {
    for (const op of pageChars) {
      const profName = getProfessionName(op);
      const propName = getElementName(op);
      container.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `**${op.charData.name}** ${getProfessionEmoji(profName)} ${getPropertyEmoji(propName)}`,
                `${RarityEmoji}`.repeat(Number(op.charData.rarity?.value ?? 0)),
                `Level ${op.level} · Recruited <t:${op.ownTs}:d>`,
              ].join('\n')
            )
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(createComponentId('characters', 'view', op.charData.id, stateStr))
              .setLabel('View Character')
              .setStyle(ButtonStyle.Primary)
          )
      );
    }
  }

  if (filtered.length > CHARS_PER_PAGE) {
    container.addSeparatorComponents((separator) => separator);

    const prevStateStr = toStateStr({
      page: Math.max(0, clampedPage - 1),
      profession,
      element,
      rarity,
      shortId: sid,
    });
    const nextStateStr = toStateStr({
      page: Math.min(totalPages - 1, clampedPage + 1),
      profession,
      element,
      rarity,
      shortId: sid,
    });

    container.addActionRowComponents((actionRow) =>
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(createComponentId('characters', 'page', prevStateStr))
          .setLabel('Previous')
          .setStyle(clampedPage === 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(clampedPage === 0),
        new ButtonBuilder()
          .setCustomId(createComponentId('characters', 'page', stateStr))
          .setLabel(`${clampedPage + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(createComponentId('characters', 'page', nextStateStr))
          .setLabel('Next')
          .setStyle(clampedPage >= totalPages - 1 ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(clampedPage >= totalPages - 1)
      )
    );
  }

  return container;
};

/**
 * @param {Characters} character
 * @param {string} [catalogStateStr] - Optional state (page:profession:element) to restore when going back
 */
const buildCharacterContainer = (character, catalogStateStr) => {
  const { charData, level, evolvePhase, potentialLevel, ownTs, weapon } = character;
  const profName = getProfessionName(character);
  const propName = getElementName(character);

  const container = new ContainerBuilder().addSectionComponents((section) =>
    section
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            `## ${charData.name}`,
            `${getProfessionEmoji(profName)}${getPropertyEmoji(propName)} | ` +
              Rarity2Emoji.repeat(Number(charData.rarity.value || 0)),
            `Level **${level}**/${getMaxLevel(evolvePhase)} · Potential **${potentialLevel}**`,
            `Recruited <t:${ownTs}:D> at <t:${ownTs}:t>`,
          ].join('\n')
        )
      )
      .setThumbnailAccessory((thumb) => thumb.setURL(charData.avatarRtUrl))
  );

  if (weapon && weapon.weaponData) {
    container.addTextDisplayComponents((textDisplay) => textDisplay.setContent('### Weapons'));
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        [
          `[${weapon.weaponData.type.value}] ${weapon.weaponData.name}`,
          `${Rarity2Emoji}`.repeat(Number(weapon.weaponData.rarity.value || 0)),
          `Lv. **${weapon.level}**/${getBreakthroughLevel(weapon.breakthroughLevel)} · Refine **${weapon.refineLevel}**`,
        ].join('\n')
      )
    );
  }

  const skillLines = ['### Skills'];
  for (const skill of Object.values(character.userSkills)) {
    const skillData = character.charData.skills.find((s) => s.id === skill.skillId);
    skillLines.push(
      `[${skillData?.type.value}] ${skillData?.name}\n-# Rank **${skill.level}**/${skill.maxLevel}`
    );
  }

  container.addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(skillLines.join('\n'))
  );

  const equips = [
    character.bodyEquip,
    character.armEquip,
    character.firstAccessory,
    character.secondAccessory,
  ].filter((equip) => equip && equip.equipData);

  if (equips.length > 0) {
    const gearLines = ['### Gear'];
    for (const equip of equips) {
      const equipData = equip?.equipData;
      if (!equipData) continue;
      gearLines.push(
        `[${equipData.type.value}] ${equipData.name}\n-# Level **${equipData.level.value}**`
      );
    }

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(gearLines.join('\n'))
    );
  }

  if (character.tacticalItem && character.tacticalItem.tacticalItemData) {
    const { tacticalItemData } = character.tacticalItem;
    const activeParams = tacticalItemData.activeEffectParams ?? {};
    const passiveParams = tacticalItemData.passiveEffectParams ?? {};

    const activeText = substituteTacticalParams(tacticalItemData.activeEffect, activeParams);
    const passiveText = substituteTacticalParams(tacticalItemData.passiveEffect, passiveParams);

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent('### Tactical Item')
    );

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `[${tacticalItemData.activeEffectType.value}] ${tacticalItemData.name}\n-# ${activeText}\n-# ${passiveText}`
      )
    );
  }

  container.addSeparatorComponents((separator) => separator);

  const backCustomId = catalogStateStr
    ? createComponentId('characters', 'catalog', catalogStateStr)
    : createComponentId('characters', 'catalog');

  const backButton = new ButtonBuilder()
    .setCustomId(backCustomId)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);

  const sid = catalogStateStr ? parseState(catalogStateStr).shortId : 0;
  const imagePayload = sid > 0 ? `${character.charData.id}:${sid}` : character.charData.id;
  const toImageButton = new ButtonBuilder()
    .setCustomId(createComponentId('characters', 'image', imagePayload))
    .setLabel('Generate Image')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents((actionRow) =>
    actionRow.addComponents(backButton, toImageButton)
  );

  return container;
};

export default {
  data: new SlashCommandBuilder()
    .setName('characters')
    .setDescription('View all your obtained operators')
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to view the characters of')
        .setAutocomplete(true)
        .setRequired(false)
    )
    .addStringOption((option) =>
      option.setName('name').setDescription('The name of the character').setAutocomplete(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  /** @param {import('discord.js').AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);

    if (focusedOption.name === 'account') {
      const accounts = await Accounts.getByDcid(interaction.user.id);
      if (!accounts || accounts.length === 0) {
        await interaction.respond([{ name: 'No accounts found', value: '-999' }]);
        return;
      }

      const filtered = accounts
        .filter((a) => a.nickname.toLowerCase().includes(focusedOption.value.toLowerCase()))
        .slice(0, 25);

      await interaction.respond(
        filtered.map((a) => ({ name: `${a.nickname} (${a.roleId})`, value: String(a.shortId) }))
      );
      return;
    }

    if (focusedOption.name === 'name') {
      const accounts = await Accounts.getByDcid(interaction.user.id);
      if (!accounts?.length) {
        await interaction.respond([{ name: 'No accounts found', value: '-999' }]);
        return;
      }

      const account = resolveAccount(accounts, interaction.options.getString('account'));
      if (!account) {
        await interaction.respond([{ name: 'Account not found', value: '-999' }]);
        return;
      }

      const characters = await getCharacters(interaction.user.id, account.id);
      if (!characters || characters.status !== 0) {
        const { code, msg } = parseErrorMsg(characters);
        await interaction.respond([{ name: `[${code}] ${msg}`, value: '-999' }]);
        return;
      }

      const filtered = characters.data
        .filter((c) => c.charData.name.toLowerCase().includes(focusedOption.value.toLowerCase()))
        .slice(0, 25);

      await interaction.respond(
        filtered.map((c) => ({ name: c.charData.name, value: c.charData.id }))
      );
    }
  },
  /** @param {import('discord.js').ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const selected = interaction.options.getString('name');
    const targetAccount = interaction.options.getString('account');
    await interaction.deferReply();

    const accounts = await Accounts.getByDcid(interaction.user.id);
    if (!accounts?.length) {
      await interaction.editReply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const account = resolveAccount(accounts, targetAccount);

    if (!account) {
      await interaction.editReply({
        components: [errorContainer('Account not found.')],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const characters = await getCharacters(interaction.user.id, account.id);
    if (!characters || characters.status !== 0) {
      const { code, msg } = parseErrorMsg(characters);
      await interaction.editReply({
        components: [errorContainer(`[${code}] ${msg}`)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await Events.create(interaction.user.id, {
        source: 'slash',
        action: 'characters',
      });
    }

    if (selected) {
      const character = characters.data.find((c) => c.charData.id === selected);
      if (!character) {
        await interaction.editReply({ components: [errorContainer('Character not found')] });
        return;
      }
      const catalogStateStr = toStateStr({ ...INITIAL_STATE, shortId: account.shortId });
      await interaction.editReply({
        components: [buildCharacterContainer(character, catalogStateStr)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.editReply({
      components: [
        buildCatalogContainer(characters.data, { ...INITIAL_STATE, shortId: account.shortId }),
      ],
      files: [notFoundImage],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
  interactions: {
    button: characterButtonInteractions,
    selectMenu: characterSelectMenuInteractions,
  },
};

/** @param {import('discord.js').MessageComponentInteraction} interaction @param {number} [shortId=0] */
async function getCharactersForInteraction(interaction, shortId = 0) {
  const aid = shortId
    ? (await Accounts.getByDcidAndShortId(interaction.user.id, shortId))?.id
    : undefined;
  return getCharacters(interaction.user.id, aid);
}

/** @param {import('discord.js').ButtonInteraction} interaction @param {string} [stateStr] */
async function showCharactersCatalog(interaction, stateStr) {
  await interaction.deferUpdate();

  const state = stateStr ? parseState(stateStr) : INITIAL_STATE;
  const characters = await getCharactersForInteraction(interaction, state.shortId);
  if (!characters || characters.status !== 0) {
    await charactersErrorReply(interaction, characters);
    return;
  }

  const container = buildCatalogContainer(characters.data, state);
  await interaction.editReply({ components: [container], files: [notFoundImage] });
}

/**
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} charId
 * @param {string} [catalogStateStr]
 */
async function showCharacterDetail(interaction, charId, catalogStateStr) {
  await interaction.deferUpdate();

  const state = catalogStateStr ? parseState(catalogStateStr) : INITIAL_STATE;
  const characters = await getCharactersForInteraction(interaction, state.shortId);
  if (!characters || characters.status !== 0) {
    await charactersErrorReply(interaction, characters);
    return;
  }

  const character = characters.data.find((c) => c.charData.id === charId);
  if (!character) {
    await interaction.editReply({ components: [errorContainer('Character not found')] });
    return;
  }

  await interaction.editReply({
    components: [buildCharacterContainer(character, catalogStateStr)],
  });
}

/** @param {import('discord.js').ButtonInteraction} interaction @param {string} stateStr */
async function showCharactersPage(interaction, stateStr) {
  await interaction.deferUpdate();

  const state = parseState(stateStr);
  const characters = await getCharactersForInteraction(interaction, state.shortId);
  if (!characters || characters.status !== 0) {
    await charactersErrorReply(interaction, characters);
    return;
  }

  const container = buildCatalogContainer(characters.data, state);
  await interaction.editReply({ components: [container], files: [notFoundImage] });
}

/**
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {string} rarity
 * @param {string} stateStr
 */
async function filterCharactersByRarity(interaction, rarity, stateStr) {
  await interaction.deferUpdate();

  const baseState = parseState(stateStr);
  const characters = await getCharactersForInteraction(interaction, baseState.shortId);
  if (!characters || characters.status !== 0) {
    await charactersErrorReply(interaction, characters);
    return;
  }

  const state = {
    ...baseState,
    page: 0,
    rarity: rarity === '*' ? 'all' : rarity,
  };
  const container = buildCatalogContainer(characters.data, state);
  await interaction.editReply({ components: [container], files: [notFoundImage] });
}

/** @param {import('discord.js').ButtonInteraction} interaction @param {string} payload */
async function generateCharacterImage(interaction, payload) {
  await interaction.deferUpdate();

  const [charId, sid] = payload.split(':');
  const shortId = parseInt(sid ?? '0', 10) || 0;
  const characters = await getCharactersForInteraction(interaction, shortId);
  if (!characters || characters.status !== 0) {
    await charactersErrorReply(interaction, characters);
    return;
  }

  const character = characters.data.find((c) => c.charData.id === charId);
  if (!character) {
    await interaction.editReply({ components: [errorContainer('Character not found')] });
    return;
  }

  const attachment = await generateCharacterBuild(interaction.user.id, character);
  await interaction.followUp({ files: [attachment] });
}

/**
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 * @param {string} filterWhich
 * @param {string} stateStr
 */
async function filterCharactersSelectMenu(interaction, filterWhich, stateStr) {
  await interaction.deferUpdate();

  const state = parseState(stateStr);
  const selectedValue = interaction.values[0];
  const profession = filterWhich === 'opclass' ? selectedValue : state.profession;
  const element = filterWhich === 'element' ? selectedValue : state.element;

  const characters = await getCharactersForInteraction(interaction, state.shortId);
  if (!characters || characters.status !== 0) {
    await charactersErrorReply(interaction, characters);
    return;
  }

  const container = buildCatalogContainer(characters.data, {
    page: 0,
    profession,
    element,
    rarity: state.rarity ?? 'all',
    shortId: state.shortId,
  });
  await interaction.editReply({ components: [container], files: [notFoundImage] });
}
