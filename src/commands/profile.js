import {
  ContainerBuilder,
  MessageFlags,
  SectionBuilder,
  SlashCommandBuilder,
  TextDisplayBuilder,
  codeBlock,
} from 'discord.js';
import { BotConfig } from '../../config.js';
import { createEvent, getAccount, getUser } from '../db/queries.js';
import { getCachedCardDetail } from '../skport/utils/getCachedCardDetail.js';
import { MessageTone, noUserContainer, textContainer } from '../utils/containers.js';
import { ProfessionEmojis, ProfileEmojis, PropertyEmojis, RarityEmoji } from '../utils/emojis.js';
import { privacy } from '../utils/privacy.js';

export default {
  data: new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Get your profile information')
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

    const account = await getAccount(interaction.user.id);
    if (!account) {
      await interaction.reply({
        components: [textContainer('Please link a SKPort account with /link account first')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await createEvent(interaction.user.id, {
        source: 'slash',
        action: 'profile',
      });
    }

    await interaction.reply({
      components: [textContainer('Loading profile information...')],
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

    await interaction.editReply({
      components: [textContainer('Profile information loaded')],
      flags: [MessageFlags.IsComponentsV2],
    });

    const profileContainer = new ContainerBuilder();
    console.log(profile.data.spaceShip.rooms);

    const introSection = new SectionBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            `## ▼// ${profile.data.base.name}`,
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
