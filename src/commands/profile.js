import {
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { errorContainer, textContainer } from '#/components/index.js';
import { Events, Accounts, Users } from '#/db/queries.js';
import { getCachedCardDetail } from '#/skport/utils/getCachedCardDetail.js';
import {
  getMissingLinkedAccountMessage,
  parseApiError,
  resolvePrimaryAccount,
  respondWithAccountAutocomplete,
} from '#/utils/commandHelpers.js';
import { ProfessionEmojis, ProfileEmojis, PropertyEmojis, RarityEmoji } from '#/utils/emojis.js';
import { privacy } from '#/utils/privacy.js';
import { BotConfig } from '#/config';

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
    const focusedOptions = interaction.options.getFocused(true);
    const userId = interaction.options.get('user')?.value || interaction.user.id;
    await respondWithAccountAutocomplete(interaction, { userId, query: focusedOptions.value });
  },
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    const targetAccount = interaction.options.getString('account');

    const dcid = targetUser?.id || interaction.user.id;
    const accounts = await Accounts.getByDcid(dcid);

    if (!accounts?.length) {
      await interaction.reply({
        components: [errorContainer(getMissingLinkedAccountMessage(targetUser))],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const account = resolvePrimaryAccount(accounts, targetAccount);
    if (!account) {
      await interaction.reply({
        components: [errorContainer('Account not found.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (account && account.isPrivate) {
      await interaction.reply({
        components: [errorContainer('That account is private.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    const user = await Users.getByDcid(dcid);
    if (!user || user.isBanned) {
      await interaction.reply({
        components: [errorContainer('User not found or banned.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await Events.create(interaction.user.id, {
        aid: account.id,
        source: 'slash',
        action: 'profile',
      });
    }

    await interaction.reply({
      components: [textContainer('// Accessing Endfield database...')],
      flags: [MessageFlags.IsComponentsV2],
    });

    const profile = await getCachedCardDetail(dcid, account.id);
    if (!profile || profile.status !== 0) {
      const { code, msg } = parseApiError(profile);
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
            // expect escape character errors here, its for formatting on Discord
            `\> Awakening Day: <t:${profile.data.base.createTime}:D>`,
            `\> UID: ${privacy(profile.data.base.roleId, account.isPrivate)}`,
            `\> Server: ${profile.data.base.serverName}`,
            `\> Last Login: <t:${profile.data.base.lastLoginTime}:R>`,
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
        `### ${ProfileEmojis.RealTimeData} [ Real-Time Data ]`,
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
        `### ${ProfileEmojis.RegionalDevelopment} [ Regional Development ]\n${domains}`
      )
    );

    profileContainer.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(`### ${ProfileEmojis.Operator} [ Operators ]`)
    );

    for (const operator of profile.data.chars.slice(0, 3)) {
      profileContainer.addSectionComponents((section) =>
        section
          .addTextDisplayComponents((textDisplay) =>
            textDisplay.setContent(
              [
                `**${operator.charData.name}** ${ProfessionEmojis[/** @type {keyof typeof ProfessionEmojis} */ (operator.charData.profession.value)]} ${PropertyEmojis[/** @type {keyof typeof PropertyEmojis} */ (operator.charData.property.value)]}`,
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
