import {
  MessageFlags,
  SlashCommandBuilder,
  ContainerBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import { errorContainer, textContainer } from '#/components/index.js';
import { Accounts, Events, Users } from '#/db/index.js';
import { getCachedCardDetail } from '#/skport/utils/getCachedCardDetail.js';
import { createComponentId } from '#/utils/componentId.js';
import { BotConfig } from '#/config';

const AUTOCOMPLETE_VALUES = {
  NO_USER: '__no_user__',
  USER_NOT_FOUND: '__user_not_found__',
  USER_BANNED: '__user_banned__',
  USER_PRIVATE: '__user_private__',
  NO_ACCOUNTS: '__no_accounts__',
};

const explorationSelectMenuInteractions = {
  domain: { ownerOnly: true, execute: handleExplorationDomainSelect },
};

export default {
  data: new SlashCommandBuilder()
    .setName('exploration')
    .setDescription('View your Region Exploration data')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to view the exploration data of')
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to view the exploration data of')
        .setAutocomplete(true)
        .setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").AutocompleteInteraction} interaction */
  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);
    const targetUserId = interaction.options.get('user')?.value;
    const userId = targetUserId || interaction.user.id;
    if (!userId || typeof userId !== 'string') {
      return interaction.respond([{ name: 'No user found', value: AUTOCOMPLETE_VALUES.NO_USER }]);
    }

    const isTargetingOtherUser = targetUserId && targetUserId !== interaction.user.id;
    if (isTargetingOtherUser) {
      const user = await Users.getByDcid(userId);
      if (!user) {
        return interaction.respond([
          { name: 'User not found', value: AUTOCOMPLETE_VALUES.USER_NOT_FOUND },
        ]);
      }
      if (user.isBanned) {
        return interaction.respond([
          { name: 'User is banned.', value: AUTOCOMPLETE_VALUES.USER_BANNED },
        ]);
      }
      if (user.isPrivate)
        return interaction.respond([
          { name: 'That user is private.', value: AUTOCOMPLETE_VALUES.USER_PRIVATE },
        ]);
    }

    const accounts = await Accounts.getByDcid(userId);
    const visibleAccounts = isTargetingOtherUser
      ? (accounts ?? []).filter((a) => !a.isPrivate)
      : (accounts ?? []);
    if (!visibleAccounts.length) {
      return interaction.respond([
        { name: 'No accounts found', value: AUTOCOMPLETE_VALUES.NO_ACCOUNTS },
      ]);
    }

    const query = focused.value.toLowerCase();
    const choices = visibleAccounts
      .filter((a) => a.nickname.toLowerCase().includes(query))
      .slice(0, 25)
      .map((a) => ({ name: `${a.nickname} (${a.roleId})`, value: a.id }));

    return interaction.respond(choices);
  },
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetAccount = interaction.options.getString('account');
    const isTargetingOtherUser = !!targetUser && targetUser.id !== interaction.user.id;

    if (isTargetingOtherUser) {
      switch (targetAccount) {
        case AUTOCOMPLETE_VALUES.NO_USER:
        case AUTOCOMPLETE_VALUES.USER_NOT_FOUND:
        case AUTOCOMPLETE_VALUES.USER_BANNED:
          await interaction.reply({
            components: [errorContainer('User not found or banned.')],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          });
          return;
        case AUTOCOMPLETE_VALUES.USER_PRIVATE:
          await interaction.reply({
            components: [errorContainer('That user is private.')],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          });
          return;
        case AUTOCOMPLETE_VALUES.NO_ACCOUNTS:
          await interaction.reply({
            components: [errorContainer('That user has no linked accounts.')],
            flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
          });
          return;
      }
    }

    const dcid = targetUser?.id || interaction.user.id;
    const accounts = await Accounts.getByDcid(dcid);
    const user = await Users.getByDcid(dcid);

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

    if (!user || user.isBanned) {
      await interaction.reply({
        components: [errorContainer('User not found or banned.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (isTargetingOtherUser && user.isPrivate) {
      await interaction.reply({
        components: [errorContainer('That user is private.')],
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
    if (isTargetingOtherUser && account.isPrivate) {
      await interaction.reply({
        components: [errorContainer('That account is private.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const interactionUser =
      interaction.user.id === user.dcid ? user : await Users.getByDcid(interaction.user.id);

    if (interactionUser && BotConfig.environment === 'production') {
      await Events.create(interactionUser.dcid, {
        source: 'slash',
        action: 'exploration',
        ...(!isTargetingOtherUser && { aid: account.id }),
        metadata: {
          ...(isTargetingOtherUser && { targetDcid: user.dcid, targetAid: account.id }),
          ...(interaction.inGuild() && {
            guildId: interaction.guildId,
          }),
        },
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

    const container = buildExplorationContainer(
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
    selectMenu: explorationSelectMenuInteractions,
  },
};

/**
 * @param {import('discord.js').StringSelectMenuInteraction} interaction
 * @param {string} [shortIdStr]
 * @param {string} [targetDcid]
 */
async function handleExplorationDomainSelect(interaction, shortIdStr, targetDcid) {
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
  const container = buildExplorationContainer(
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

/** @param {{ status?: number | string; msg?: string } | null} profile */
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
const buildExplorationContainer = (domains, domainIndex, { shortId = 0, dcid } = {}) => {
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
          .setCustomId(
            dcid
              ? createComponentId('exploration', 'domain', String(shortId), dcid)
              : createComponentId('exploration', 'domain', String(shortId))
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
