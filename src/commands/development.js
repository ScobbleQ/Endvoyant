import {
  MessageFlags,
  SlashCommandBuilder,
  ContainerBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { errorContainer, textContainer } from '#/components/index.js';
import { Events, Accounts, Users } from '#/db/index.js';
import { getCachedCardDetail } from '#/skport/utils/getCachedCardDetail.js';
import { createComponentId } from '#/utils/componentId.js';
import { BotConfig } from '#/config';

const developmentSelectMenuInteractions = {
  domain: { ownerOnly: true, execute: handleDevelopmentDomainSelect },
};

export default {
  data: new SlashCommandBuilder()
    .setName('development')
    .setDescription('View your Regional Development data')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to view the development data of')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to view the development data of')
        .setAutocomplete(true)
        .setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focusedOptions = interaction.options.getFocused(true);
    const userId = interaction.options.get('user')?.value || interaction.user.id;
    if (!userId || typeof userId !== 'string') {
      await interaction.respond([{ name: 'No user found', value: '-999' }]);
      return;
    }

    const accounts = await Accounts.getByDcid(userId);
    if (!accounts || accounts.length === 0) {
      await interaction.respond([{ name: 'No accounts found', value: '-999' }]);
      return;
    }

    const filtered = accounts
      .filter((a) => a.nickname.toLowerCase().includes(focusedOptions.value.toLowerCase()))
      .slice(0, 25);

    await interaction.respond(
      filtered.map((a) => ({ name: `${a.nickname} (${a.roleId})`, value: a.id }))
    );
  },
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetAccount = interaction.options.getString('account');

    const dcid = targetUser?.id || interaction.user.id;
    const accounts = await Accounts.getByDcid(dcid);

    if (!accounts?.length) {
      await interaction.reply({
        components: [
          errorContainer(
            targetUser
              ? 'That user has no linked accounts.'
              : 'Please add an account with `/add account` to continue.'
          ),
        ],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const account = targetAccount
      ? accounts.find((a) => a.id === targetAccount)
      : resolveAccount(accounts, 0);
    if (!account) {
      await interaction.reply({
        components: [errorContainer('Account not found.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }
    if (account.isPrivate) {
      await interaction.reply({
        components: [errorContainer('That account is private.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const user = await Users.getByDcid(dcid);
    if (!user) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await Events.create(interaction.user.id, {
        aid: account.id,
        source: 'slash',
        action: 'development',
      });
    }

    await interaction.reply({
      components: [textContainer('// Accessing Endfield database...')],
      flags: [MessageFlags.IsComponentsV2],
    });

    const profile = await getCachedCardDetail(dcid, account.id);
    if (!profile || profile.status !== 0) {
      const { code, msg } = parseProfileError(profile);
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

    const container = buildDevelopmentContainer(
      profile.data.domain,
      0,
      containerContext(dcid, interaction.user.id, account)
    );
    await interaction.editReply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
  interactions: {
    selectMenu: developmentSelectMenuInteractions,
  },
};

/**
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 * @param {string} [shortIdStr]
 * @param {string} [targetDcid]
 */
async function handleDevelopmentDomainSelect(interaction, shortIdStr, targetDcid) {
  await interaction.deferUpdate();

  const accountShortId = parseInt(shortIdStr ?? '0', 10) || 0;
  const dcid = targetDcid || interaction.user.id;
  const accounts = await Accounts.getByDcid(dcid);
  const account = resolveAccount(accounts ?? [], accountShortId);

  if (!account) {
    await interaction.editReply({
      components: [errorContainer('Account not found.')],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const profile = await getCachedCardDetail(dcid, account.id);
  if (!profile || profile.status !== 0) {
    const { code, msg } = parseProfileError(profile);
    await interaction.editReply({
      components: [errorContainer(`[${code}] ${msg}`)],
      flags: [MessageFlags.IsComponentsV2],
    });
    return;
  }

  const domainIndex = parseInt(interaction.values[0] ?? '0', 10);
  const container = buildDevelopmentContainer(
    profile.data.domain,
    domainIndex,
    containerContext(dcid, interaction.user.id, account)
  );
  await interaction.editReply({ components: [container] });
}

/** @param {Array<{ id: string; shortId?: number; isPrimary?: boolean; isPrivate?: boolean }>} accounts @param {number} [shortId] */
const resolveAccount = (accounts, shortId) =>
  shortId
    ? accounts.find((a) => a.shortId === shortId)
    : (accounts.find((a) => a.isPrimary) ?? accounts[0]);

/** @param {{ status?: number; msg?: string } | null} profile */
const parseProfileError = (profile) => {
  try {
    const parsed = JSON.parse(profile?.msg ?? '{}');
    return {
      code: parsed.code ?? profile?.status ?? -1,
      msg: parsed.message ?? profile?.msg ?? 'Unknown error',
    };
  } catch {
    return { code: profile?.status ?? -1, msg: profile?.msg ?? 'Unknown error' };
  }
};

/** @param {string} dcid @param {string} viewerId @param {{ shortId?: number }} account */
const containerContext = (dcid, viewerId, account) => ({
  shortId: account.shortId ?? 0,
  dcid: dcid !== viewerId ? dcid : undefined,
});

/**
 * @param {import('#/types/skport/profile.js').CardDetail['domain']} domains
 * @param {number} domainIndex
 * @param {{ shortId?: number; dcid?: string }} context
 */
const buildDevelopmentContainer = (domains, domainIndex, { shortId = 0, dcid } = {}) => {
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
          .setCustomId(
            dcid
              ? createComponentId('development', 'domain', String(shortId), dcid)
              : createComponentId('development', 'domain', String(shortId))
          )
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
