import {
  MessageFlags,
  SlashCommandBuilder,
  ContainerBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { createEvent, getAccount, getUser } from '../db/queries.js';
import { getCachedCardDetail } from '../skport/utils/getCachedCardDetail.js';
import { MessageTone, noUserContainer, textContainer } from '../utils/containers.js';
import { BotConfig } from '../../config.js';

/**
 * @param {import('../skport/api/profile/cardDetail.js').CardDetail['domain']} domains
 * @param {number} domainIndex
 * @returns {ContainerBuilder}
 */
const buildExplorationContainer = (domains, domainIndex) => {
  const reversedDomains = (domains ?? []).toReversed();
  const domain = reversedDomains[domainIndex];
  if (!domain) {
    return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent('No exploration data.')
    );
  }

  const formatStat = (
    /** @type {string} */ label,
    /** @type {{ count: number; total: number }} */ { count, total }
  ) => `${label}: ${total === 0 ? '-' : `${count} / ${total}`}`;

  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(`## ${domain.name}`)
  );

  const levels = (domain.levels ?? []).toReversed();
  for (const level of levels) {
    const exploreData = [
      formatStat('Crate', level.trchestCount),
      formatStat('Aurylene', level.puzzleCount),
      formatStat('Protocol Datalogger', level.blackboxCount),
      formatStat('Repair Logic', level.pieceCount),
      formatStat('Gear Template Crate', level.equipTrchestCount),
    ].filter(Boolean);

    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`**${level.name}**\n${exploreData.join('\n')}`)
    );

    container.addSeparatorComponents((separator) => separator);
  }

  if (reversedDomains.length > 1) {
    container.addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new StringSelectMenuBuilder()
          .setCustomId('exploration-domain')
          .setPlaceholder('Switch region')
          .addOptions(
            reversedDomains.map((d, i) => ({
              label: d.name,
              value: String(i),
              default: i === domainIndex,
            }))
          )
      )
    );
  }

  return container;
};

export default {
  data: new SlashCommandBuilder()
    .setName('exploration')
    .setDescription('View your Region Exploration data')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const user = await getUser(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [noUserContainer({ tone: MessageTone.Formal })],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await createEvent(interaction.user.id, {
        source: 'slash',
        action: 'exploration',
      });
    }

    const account = await getAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({
        components: [textContainer('Please link a SKPort account with /link account first')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.reply({
      components: [textContainer('// Accessing Endfield database...')],
      flags: [MessageFlags.IsComponentsV2],
    });

    const profile = await getCachedCardDetail(interaction.user.id);
    if (!profile || profile.status !== 0) {
      const code = JSON.parse(profile.msg).code || profile.status || -1;
      const msg = JSON.parse(profile.msg).message || profile.msg || 'Unknown error';

      await interaction.editReply({
        components: [textContainer(`### [${code}] ${msg}`)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    const container = buildExplorationContainer(profile.data.domain, 0);
    await interaction.editReply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
  /** @param {import('discord.js').StringSelectMenuInteraction} interaction @param {...string} args */
  async selectMenu(interaction, ...args) {
    if (args[0] !== 'domain') return;

    await interaction.deferUpdate();

    const domainIndex = parseInt(interaction.values[0] ?? '0', 10);
    const profile = await getCachedCardDetail(interaction.user.id);
    if (!profile || profile.status !== 0) {
      return;
    }

    const container = buildExplorationContainer(profile.data.domain, domainIndex);
    await interaction.editReply({ components: [container] });
  },
};
