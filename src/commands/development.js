import {
  MessageFlags,
  SlashCommandBuilder,
  ContainerBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { errorContainer, textContainer } from '#/components/index.js';
import { createEvent, getAccount, getUser } from '#/db/queries.js';
import { getCachedCardDetail } from '#/skport/utils/getCachedCardDetail.js';
import { BotConfig } from '#/config';

/**
 * @param {import('../skport/api/profile/cardDetail.js').CardDetail['domain']} domains
 * @param {number} domainIndex
 * @returns {ContainerBuilder}
 */
const buildDevelopmentContainer = (domains, domainIndex) => {
  const reversedDomains = (domains ?? []).toReversed();
  const domain = reversedDomains[domainIndex];
  if (!domain) {
    return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent('No development data.')
    );
  }

  const container = new ContainerBuilder().addTextDisplayComponents((textDisplay) => {
    const moneyMgr = domain.moneyMgr ?? { total: '0', count: '0' };
    const totalFormatted = Number(moneyMgr.total).toLocaleString();
    const countFormatted = Number(moneyMgr.count).toLocaleString();
    return textDisplay.setContent(
      `## ${domain.name}\nRegion Lv. **${domain.level}**\nFunds **${countFormatted}** / **${totalFormatted}**`
    );
  });

  for (const settlement of domain.settlements ?? []) {
    const remainFormatted = Number(settlement.remainMoney ?? 0).toLocaleString();
    const maxFormatted = Number(settlement.moneyMax ?? 0).toLocaleString();
    const expToLevelUp = Number(settlement.expToLevelUp ?? 0);
    const expLine =
      expToLevelUp > 0
        ? `Exp **${Number(settlement.exp ?? 0).toLocaleString()}** / **${expToLevelUp.toLocaleString()}**`
        : `Exp **${Number(settlement.exp ?? 0).toLocaleString()}** (max)`;
    const lastTick = settlement.lastTickTime ? `<t:${settlement.lastTickTime}:R>` : '-';
    const lines = [
      `**${settlement.name}**`,
      `Lv. **${settlement.level}** · ${expLine}`,
      `Funds **${remainFormatted}** / **${maxFormatted}**`,
      `Last tick ${lastTick}`,
    ];

    container.addSectionComponents((section) =>
      section
        .addTextDisplayComponents((textDisplay) => textDisplay.setContent(lines.join('\n')))
        .setThumbnailAccessory((thumbnail) =>
          thumbnail.setURL(settlement.officerCharAvatar || 'https://placehold.co/96x96?text=?')
        )
    );

    container.addSeparatorComponents((separator) => separator);
  }

  if (reversedDomains.length > 1) {
    container.addActionRowComponents((actionRow) =>
      actionRow.setComponents(
        new StringSelectMenuBuilder()
          .setCustomId('development-domain')
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
    .setName('development')
    .setDescription('View your Regional Development data')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const user = await getUser(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await createEvent(interaction.user.id, {
        source: 'slash',
        action: 'development',
      });
    }

    const account = await getAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
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
        components: [errorContainer(`[${code}] ${msg}`)],
        flags: [MessageFlags.IsComponentsV2],
      });
      return;
    }

    await interaction.editReply({
      components: [textContainer('// Loading resources...')],
      flags: [MessageFlags.IsComponentsV2],
    });

    const container = buildDevelopmentContainer(profile.data.domain, 0);
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

    const container = buildDevelopmentContainer(profile.data.domain, domainIndex);
    await interaction.editReply({ components: [container] });
  },
};
