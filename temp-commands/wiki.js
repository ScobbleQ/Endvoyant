// @ts-ignore

import { ContainerBuilder, MessageFlags, SlashCommandBuilder } from 'discord.js';
import { getOperators } from '../src/skport/api/wiki/operators.js';
import { getWeapons } from '../src/skport/api/wiki/weapons.js';
import { getOrCreateCache, getOrSet } from '../src/skport/utils/cache.js';
import { resolveSubType } from '../src/skport/utils/resolveSubType.js';
import { maintenanceContainer } from '../src/utils/containers.js';

/** @typedef {import('../src/skport/utils/typedef.js').WikiApiResponse} WikiApiResponse */

const WIKI_TTL = 5 * 60 * 1000; // 5 minutes
const wikiCache = getOrCreateCache('wiki', WIKI_TTL);

export default {
  data: new SlashCommandBuilder()
    .setName('wiki')
    .setDescription('View your characters')
    .addStringOption((option) =>
      option
        .setName('category')
        .setDescription('The category of wiki to view')
        .setRequired(true)
        .addChoices(
          { name: 'Operators', value: 'operators' },
          { name: 'Weapons', value: 'weapons' },
          { name: 'Item Files', value: 'item-files' },
          { name: 'Valuables Stash', value: 'valuables-stash' },
          { name: 'Facilities', value: 'facilities' },
          { name: 'Gear', value: 'gear' },
          { name: 'Essences', value: 'essences' },
          { name: 'Threats', value: 'threats' },
          { name: 'Missions', value: 'missions' },
          { name: 'Events', value: 'events' }
        )
    )
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('The query to search for')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const category = interaction.options.getString('category');
    const query = focusedOption.value.toLowerCase();

    /** @type {WikiApiResponse[]} */
    const operators = await getOrSet(wikiCache, 'operator', getOperators);

    /** @type {WikiApiResponse[]} */
    const weapons = await getOrSet(wikiCache, 'weapon', getWeapons);

    const choices = {
      operators,
      weapons,
    };

    const items = choices[/** @type {keyof typeof choices} */ (category)] || [];

    // Filter items based on user's query, limit to 25 items
    const filtered = items.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 25);

    // Respond with the filtered items
    await interaction.respond(filtered.map((item) => ({ name: item.name, value: item.itemId })));
  },
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const category = interaction.options.getString('category');
    const query = interaction.options.getString('query');

    /** @type {WikiApiResponse[] | null} */
    let data = null;
    if (category === 'operators') {
      data = await getOrSet(wikiCache, 'operator', getOperators);
    } else if (category === 'weapons') {
      data = await getOrSet(wikiCache, 'weapon', getWeapons);
    }

    if (!data) {
      const noDataContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `No data found for ${category}.\nPlease make sure the category is correct.`
        )
      );
      await interaction.reply({
        components: [noDataContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const item = data.find((item) => item.itemId === query);
    if (!item) {
      const notFoundContainer = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          `Item (${query}) not found in ${category}.\nPlease make sure the category and query matches.`
        )
      );
      await interaction.reply({
        components: [notFoundContainer],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const container = new ContainerBuilder();

    /** @type {Record<string, { id: string; name: string; value?: string }>} */
    let attributes = {};
    if (item.brief.subTypeList && item.brief.subTypeList.length > 0) {
      for (const subType of item.brief.subTypeList) {
        const resolved = resolveSubType(subType.subTypeId, subType.value);
        if (resolved) {
          // Extract category and create a clean object without the category property
          const { category, ...value } = resolved;
          attributes[category] = value;
        }
      }
    }

    if (category === 'operators') {
      container.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `# ${item.name} ${attributes.profession.value} ${attributes.elementType.value}`,
                `-# ${attributes.rarity.value?.split('_')[1]}`,
                `Faction: ${attributes.faction.name} | Weapon Type: ${attributes.weaponType.name}`,
              ].join('\n')
            )
          )
          .setThumbnailAccessory((thumbnail) => thumbnail.setURL(item.brief.cover))
      );
    } else if (category === 'weapons') {
      container.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `# ${item.name}`,
                `-# ${attributes.rarity.value?.split('_')[1]}`,
                `Type: ${attributes.weaponType.name}`,
              ].join('\n')
            )
          )
          .setThumbnailAccessory((thumbnail) => thumbnail.setURL(item.brief.cover))
      );
    }

    if (item.caption && item.caption.length > 0) {
      for (const caption of item.caption) {
        if (caption.kind === 'text') {
          container.addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(caption.text.text)
          );
        }
      }
    }

    await interaction.reply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
  },
};
