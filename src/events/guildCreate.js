import { Events, ContainerBuilder, ButtonStyle, ButtonBuilder, MessageFlags } from 'discord.js';
import { BotConfig } from '#/config';
import logger from '#/logger';

export default {
  name: Events.GuildCreate,
  /** @param {import("discord.js").Guild} guild */
  async execute(guild) {
    logger.info(`[Discord] Guild created: ${guild.name} (${guild.id})`);
    const systemChannel = guild.systemChannel;
    if (!systemChannel) return;

    const container = new ContainerBuilder()
      .addTextDisplayComponents((textDisplay) =>
        textDisplay.setContent(
          [
            '## ▼// Endvoyant graces your server!',
            'Endvoyant is an utility bot for Arknights: Endfield.',
            'To get started, please use the `/add account` command to add your account.',
            'If you have any questions, please check out our website or support server.',
            '',
            'Thank you for using Endvoyant!',
            '-# We recommend adding the bot to `My Apps` for full functionality.',
          ].join('\n')
        )
      )
      .addActionRowComponents((actionRow) =>
        actionRow.addComponents(
          new ButtonBuilder()
            .setURL('https://ake.xentriom.com/')
            .setLabel('Website')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setURL(`https://discord.com/oauth2/authorize?client_id=${BotConfig.clientId}`)
            .setLabel('Invite Bot')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setURL(`https://discord.gg/5rUsSZTyf2`)
            .setLabel('Support Server')
            .setStyle(ButtonStyle.Link),
          new ButtonBuilder()
            .setURL('https://github.com/ScobbleQ/Endvoyant')
            .setLabel('GitHub')
            .setStyle(ButtonStyle.Link)
        )
      );

    await systemChannel.send({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
};
