import {
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  AttachmentBuilder,
} from 'discord.js';
import { ElementType, Profession } from '../skport/utils/constants.js';
import { getCachedCardDetail } from '../skport/utils/getCachedCardDetail.js';
import { errorContainer } from '../components/containers/index.js';
import { ProfessionEmojis, PropertyEmojis, RarityEmoji, Rarity2Emoji } from '../utils/emojis.js';
import { getMaxLevel, getBreakthroughLevel } from '../utils/game.js';
import { generateCharacterBuild } from '../utils/generateCharacterBuild.js';
import { Events } from '../db/queries.js';
import { BotConfig } from '../../config.js';

/** @typedef {import('../skport/api/profile/cardDetail.js').Characters} Characters */

const CHARS_PER_PAGE = 5;
const INITIAL_STATE = {
  page: 0,
  profession: 'all',
  element: 'all',
  rarity: 'all',
};

const notFoundImage = new AttachmentBuilder('assets/images/pensive.png');

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
 * @returns {string}
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
 * @returns {Promise<{ status: -1, msg: string } | { status: 0, data: Characters[] }>}
 */
const getCharacters = async (dcid) => {
  const result = await getCachedCardDetail(dcid);
  if (result.status !== 0) return result;
  return { status: 0, data: result.data.chars };
};

/**
 * @param {string} stateStr - Format: page:profession:element[:rarity]
 * @returns {{ page: number, profession: string, element: string, rarity: string }}
 */
const parseState = (stateStr) => {
  const [page = '0', profession = 'all', element = 'all', rarity = 'all'] = stateStr.split(':');
  return {
    page: Math.max(0, parseInt(page, 10) || 0),
    profession,
    element,
    rarity,
  };
};

/**
 * @param {Characters} char
 * @param {string} profession
 * @returns {boolean}
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
 * @returns {boolean}
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
 * @returns {boolean}
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
 * @param {{ page: number, profession: string, element: string, rarity: string }} state
 * @returns {ContainerBuilder}
 */
const buildCatalogContainer = (chars, { page, profession, element, rarity }) => {
  const filtered = chars.filter((c) => {
    return (
      matchesProfession(c, profession) && matchesElement(c, element) && matchesRarity(c, rarity)
    );
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / CHARS_PER_PAGE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageChars = filtered.slice(
    clampedPage * CHARS_PER_PAGE,
    (clampedPage + 1) * CHARS_PER_PAGE
  );
  const stateStr = `${clampedPage}:${profession}:${element}:${rarity}`;

  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent('## ▼// Owned Operators')
  );

  container.addActionRowComponents((actionRow) =>
    actionRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`characters-rarity:*:${stateStr}`)
        .setLabel('✦')
        .setStyle(rarity === 'all' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`characters-rarity:4:${stateStr}`)
        .setLabel('4 ✦')
        .setStyle(rarity === '4' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`characters-rarity:5:${stateStr}`)
        .setLabel('5 ✦')
        .setStyle(rarity === '5' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`characters-rarity:6:${stateStr}`)
        .setLabel('6 ✦')
        .setStyle(rarity === '6' ? ButtonStyle.Success : ButtonStyle.Secondary)
    )
  );

  container.addActionRowComponents((actionRow) =>
    actionRow.setComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`characters-filter-opclass-${stateStr}`)
        .setPlaceholder('Filter by profession')
        .addOptions(
          {
            label: 'All Professions',
            value: 'all',
            emoji: '<:chevronalldirections:1482936485719310482>',
          },
          ...Object.values(Profession).map((p) => ({
            emoji: ProfessionEmojis[/** @type {keyof typeof ProfessionEmojis} */ (p.name)],
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
        .setCustomId(`characters-filter-element-${stateStr}`)
        .setPlaceholder('Filter by element')
        .addOptions(
          {
            label: 'All Elements',
            value: 'all',
            emoji: '<:chevronalldirections:1482936485719310482>',
          },
          ...Object.values(ElementType).map((e) => ({
            emoji: PropertyEmojis[/** @type {keyof typeof PropertyEmojis} */ (e.name)],
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
                `**${op.charData.name}** ${ProfessionEmojis[/** @type {keyof typeof ProfessionEmojis} */ (profName)]} ${PropertyEmojis[/** @type {keyof typeof PropertyEmojis} */ (propName)]}`,
                `${RarityEmoji}`.repeat(Number(op.charData.rarity?.value ?? 0)),
                `Level ${op.level} · Recruited <t:${op.ownTs}:d>`,
              ].join('\n')
            )
          )
          .setButtonAccessory((button) =>
            button
              .setCustomId(`characters-view:${op.charData.id}:${stateStr}`)
              .setLabel('View Character')
              .setStyle(ButtonStyle.Primary)
          )
      );
    }
  }

  if (filtered.length > CHARS_PER_PAGE) {
    container.addSeparatorComponents((separator) => separator);

    const prevStateStr = `${Math.max(0, clampedPage - 1)}:${profession}:${element}:${rarity}`;
    const nextStateStr = `${Math.min(totalPages - 1, clampedPage + 1)}:${profession}:${element}:${rarity}`;

    container.addActionRowComponents((actionRow) =>
      actionRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`characters-page-prev-${prevStateStr}`)
          .setLabel('Previous')
          .setStyle(clampedPage === 0 ? ButtonStyle.Secondary : ButtonStyle.Success)
          .setDisabled(clampedPage === 0),
        new ButtonBuilder()
          .setCustomId(`characters-page-display`)
          .setLabel(`${clampedPage + 1} / ${totalPages}`)
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(true),
        new ButtonBuilder()
          .setCustomId(`characters-page-next-${nextStateStr}`)
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
 * @returns {ContainerBuilder}
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
            `${ProfessionEmojis[/** @type {keyof typeof ProfessionEmojis} */ (profName)]}${PropertyEmojis[/** @type {keyof typeof PropertyEmojis} */ (propName)]} | ` +
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
    ? `characters-catalog-${catalogStateStr}`
    : 'characters-catalog';

  const backButton = new ButtonBuilder()
    .setCustomId(backCustomId)
    .setLabel('Back')
    .setStyle(ButtonStyle.Secondary);

  const toImageButton = new ButtonBuilder()
    .setCustomId(`characters-image:${character.charData.id}`)
    .setLabel('Generate Image')
    .setStyle(ButtonStyle.Secondary);

  container.addActionRowComponents((actionRow) =>
    actionRow.addComponents(backButton, toImageButton)
  );

  return container;
};

/**
 * Parse button customId and return action + payload
 * @param {string[]} args - From customId split by '-'
 * @returns {{ action: string, payload: string }}
 */
const parseButtonArgs = (args) => {
  const first = args[0] ?? '';
  if (first.includes(':')) {
    const [action, ...rest] = first.split(':');
    return { action: action ?? '', payload: rest.join(':') ?? '' };
  }
  return { action: first, payload: args[2] ?? '' };
};

export default {
  data: new SlashCommandBuilder()
    .setName('characters')
    .setDescription('View all your obtained operators')
    .addStringOption((option) =>
      option.setName('name').setDescription('The name of the character').setAutocomplete(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),

  /** @param {import('discord.js').AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const { value } = interaction.options.getFocused(true);
    const characters = await getCharacters(interaction.user.id);

    if (!characters || characters.status !== 0) {
      const code = JSON.parse(characters.msg).code || characters.status || -1;
      const msg = JSON.parse(characters.msg).message || characters.msg || 'Unknown error';

      await interaction.respond([{ name: `[${code}] ${msg}`, value: '-999' }]);
      return;
    }

    const filtered = characters.data
      .filter((c) => c.charData.name.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((c) => ({ name: c.charData.name, value: c.charData.id }))
    );
  },
  /** @param {import('discord.js').ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const selected = interaction.options.getString('name');
    await interaction.deferReply();

    const characters = await getCharacters(interaction.user.id);
    if (!characters || characters.status !== 0) {
      const code = JSON.parse(characters.msg).code || characters.status || -1;
      const msg = JSON.parse(characters.msg).message || characters.msg || 'Unknown error';

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
      await interaction.editReply({
        components: [buildCharacterContainer(character)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.editReply({
      components: [buildCatalogContainer(characters.data, INITIAL_STATE)],
      files: [notFoundImage],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
  /** @param {import('discord.js').ButtonInteraction} interaction @param {...string} args */
  async button(interaction, ...args) {
    const { action, payload } = parseButtonArgs(args);
    await interaction.deferUpdate();

    const characters = await getCharacters(interaction.user.id);
    if (!characters || characters.status !== 0) {
      await interaction.editReply({
        components: [errorContainer(characters?.msg || 'Failed to load characters')],
      });
      return;
    }

    if (action === 'view' && payload) {
      const [charId, ...stateParts] = payload.split(':');
      const catalogStateStr = stateParts.length > 0 ? stateParts.join(':') : undefined;
      const character = characters.data.find((c) => c.charData.id === charId);
      if (character) {
        await interaction.editReply({
          components: [buildCharacterContainer(character, catalogStateStr)],
        });
      }
      return;
    }

    if (action === 'catalog') {
      const stateStr = args[1];
      const state = stateStr ? parseState(stateStr) : INITIAL_STATE;
      const container = buildCatalogContainer(characters.data, state);
      await interaction.editReply({ components: [container], files: [notFoundImage] });
      return;
    }

    if (action === 'page' && payload) {
      const container = buildCatalogContainer(characters.data, parseState(payload));
      await interaction.editReply({ components: [container], files: [notFoundImage] });
      return;
    }

    if (action === 'rarity' && payload) {
      const [rarity, ...stateParts] = payload.split(':');
      const baseState = parseState(stateParts.join(':'));
      const state = {
        ...baseState,
        page: 0,
        rarity: rarity === '*' ? 'all' : rarity,
      };
      const container = buildCatalogContainer(characters.data, state);
      await interaction.editReply({ components: [container], files: [notFoundImage] });
      return;
    }

    if (action === 'image' && payload) {
      const character = characters.data.find((c) => c.charData.id === payload);
      if (character) {
        const attachment = await generateCharacterBuild(interaction.user.id, character);
        await interaction.followUp({ files: [attachment] });
      }
    }
  },
  /** @param {import('discord.js').StringSelectMenuInteraction} interaction @param {...string} args */
  async selectMenu(interaction, ...args) {
    const [filterType, filterWhich, stateStr] = args;
    if (filterType !== 'filter' || !stateStr) return;

    await interaction.deferUpdate();

    const state = parseState(stateStr);
    const selectedValue = interaction.values[0];
    const profession = filterWhich === 'opclass' ? selectedValue : state.profession;
    const element = filterWhich === 'element' ? selectedValue : state.element;

    const characters = await getCharacters(interaction.user.id);
    if (!characters || characters.status !== 0) {
      await interaction.editReply({
        components: [errorContainer(characters?.msg || 'Failed to load characters')],
      });
      return;
    }

    const container = buildCatalogContainer(characters.data, {
      page: 0,
      profession,
      element,
      rarity: state.rarity ?? 'all',
    });
    await interaction.editReply({ components: [container], files: [notFoundImage] });
  },
};
