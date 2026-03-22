import {
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { errorContainer, textContainer } from '#/components/index.js';
import {
  getProfessionEmoji,
  getProfileEmoji,
  getPropertyEmoji,
  RarityEmoji,
} from '#/constants/emojis.js';
import { Events, Accounts, Users } from '#/db/index.js';
import { getCachedCardDetail } from '#/skport/utils/getCachedCardDetail.js';
import { privacy } from '#/utils/privacy.js';
import { BotConfig } from '#/config';

const AUTOCOMPLETE_VALUES = {
  NO_USER: '__no_user__',
  USER_NOT_FOUND: '__user_not_found__',
  USER_BANNED: '__user_banned__',
  USER_PRIVATE: '__user_private__',
  NO_ACCOUNTS: '__no_accounts__',
};

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Get your profile information')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to view the profile of').setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName('account')
        .setDescription('The account to view the profile of')
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

    let account;
    if (targetAccount) {
      account = accounts.find((a) => a.id === targetAccount);
      if (!account) {
        await interaction.reply({
          components: [errorContainer('Account not found.')],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
        return;
      }
    } else {
      account = accounts.find((a) => a.isPrimary) || accounts[0];
    }

    if (isTargetingOtherUser && account && account.isPrivate) {
      await interaction.reply({
        components: [errorContainer('That account is private.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    // Get interaction user to track events
    const interactionUser =
      interaction.user.id === user.dcid ? user : await Users.getByDcid(interaction.user.id);

    if (interactionUser && BotConfig.environment === 'production') {
      await Events.create(interactionUser.dcid, {
        source: 'slash',
        action: 'profile',
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
      const parsed = JSON.parse(profile?.msg ?? '{}');
      const code = parsed.code || profile?.status || -1;
      const msg = parsed.message || profile?.msg || 'Unknown error';
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

    const profileContainer = new ContainerBuilder();

    const introSection = new SectionBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            `## ▼// ${profile.data.base.name}`,
            `> Awakening Day: <t:${profile.data.base.createTime}:D>`,
            `> UID: ${privacy(profile.data.base.roleId, account.isPrivate)}`,
            `> Server: ${profile.data.base.serverName}`,
            `> Last Login: <t:${profile.data.base.lastLoginTime}:R>`,
          ].join('\n')
        )
      )
      .setThumbnailAccessory((thumbnail) => thumbnail.setURL(profile.data.base.avatarUrl));
    profileContainer.addSectionComponents(introSection);

    const statTextDisplay = new TextDisplayBuilder().setContent(
      [
        `Authority Level: ${profile.data.base.level}`,
        `Exploration Level: ${profile.data.base.worldLevel}`,
        `Operators: ${profile.data.base.charNum}`,
        `Weapons: ${profile.data.base.weaponNum}`,
        `Archives: ${profile.data.base.docNum}`,
        `Path of Glory: ${profile.data.achieve.count}`,
        `Control Nexux Level: ${profile.data.spaceShip.rooms.find((r) => r.type === 0)?.level}`,
      ].join('\n')
    );
    profileContainer.addTextDisplayComponents(statTextDisplay);

    profileContainer.addSeparatorComponents((separator) => separator);

    const realTimeDataTextDisplay = new TextDisplayBuilder().setContent(
      [
        `### ${getProfileEmoji('RealTimeData')} [ Real-Time Data ]`,
        `Sanity: **${profile.data.dungeon.curStamina}** / ${profile.data.dungeon.maxStamina}`,
        profile.data.dungeon.maxTs !== '0' && `Full Recovery <t:${profile.data.dungeon.maxTs}:R>`,
        `Activity Points: **${profile.data.dailyMission.dailyActivation}** / ${profile.data.dailyMission.maxDailyActivation}`,
        `Weekly Routine: **${profile.data.weeklyMission.score}** / ${profile.data.weeklyMission.total}`,
        `Protocol Pass: **${profile.data.bpSystem.curLevel}** / ${profile.data.bpSystem.maxLevel}`,
      ]
        .filter(Boolean)
        .join('\n')
    );
    profileContainer.addTextDisplayComponents(realTimeDataTextDisplay);

    const domains = profile.data.domain
      .flatMap((d) => [
        `**${d.name}** Lv.${d.level}`,
        ...d.settlements.map((s) => `-# - ${s.name}: ${s.level}`),
      ])
      .join('\n');

    profileContainer.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        `### ${getProfileEmoji('RegionalDevelopment')} [ Regional Development ]\n${domains}`
      )
    );

    profileContainer.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`### ${getProfileEmoji('Operator')} [ Operators ]`)
    );

    for (const operator of profile.data.chars.slice(0, 3)) {
      profileContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `**${operator.charData.name}** ${getProfessionEmoji(operator.charData.profession.value)} ${getPropertyEmoji(operator.charData.property.value)}`,
                `${RarityEmoji}`.repeat(Number(operator.charData.rarity.value)),
                `Recruited <t:${operator.ownTs}:d> at <t:${operator.ownTs}:t>`,
                `Level: ${operator.level}`,
              ].join('\n')
            )
          )
          .setThumbnailAccessory((thumbnail) => thumbnail.setURL(operator.charData.avatarRtUrl))
      );
    }

    await interaction.editReply({
      components: [profileContainer],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
