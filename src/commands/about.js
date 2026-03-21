import {
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
} from 'discord.js';
import { BotConfig } from '#/config';
import packageJson from '../../package.json' with { type: 'json' };

const WEBSITE_URL = 'https://ake.xentriom.com';
const SUPPORT_SERVER_URL = 'https://discord.gg/5rUsSZTyf2';
const SOURCE_CODE_URL = 'https://github.com/ScobbleQ/Endvoyant';

export default {
  data: new SlashCommandBuilder()
    .setName('about')
    .setDescription('Info, quick start tips, and useful links')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    await interaction.deferReply();

    const embed = new EmbedBuilder()
      .setColor(0x5ea7ff)
      .setTitle('Endvoyant')
      .setURL(WEBSITE_URL)
      .setDescription(`${packageJson.description}\n-# More info will be made available soon...`)
      .setFooter({ text: `Endvoyant v${packageJson.version}` })
      .setTimestamp();

    if (interaction.client.user) {
      embed.setThumbnail(interaction.client.user.displayAvatarURL());
    }

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Website').setStyle(ButtonStyle.Link).setURL(WEBSITE_URL),
      new ButtonBuilder()
        .setLabel('Invite Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(buildInviteUrl(interaction.client)),
      new ButtonBuilder()
        .setLabel('Support Server')
        .setStyle(ButtonStyle.Link)
        .setURL(SUPPORT_SERVER_URL),
      new ButtonBuilder().setLabel('GitHub').setStyle(ButtonStyle.Link).setURL(SOURCE_CODE_URL)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [row.toJSON()],
    });
  },
};

/** @param {import('discord.js').Client} client */
function buildInviteUrl(client) {
  const clientId = client.application?.id || client.user?.id || BotConfig.clientId;
  // Let Discord handle scope and permissions
  return `https://discord.com/oauth2/authorize?client_id=${clientId}`;
}
