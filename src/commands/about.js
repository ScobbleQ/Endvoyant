import {
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
} from 'discord.js';
import { Accounts, Users } from '#/db/index.js';
import { BotConfig } from '#/config';
import packageJson from '../../package.json' with { type: 'json' };

const WEBSITE_URL = 'https://ake.xentriom.com';
const SUPPORT_SERVER_URL = 'https://discord.gg/5rUsSZTyf2';
const SOURCE_CODE_URL = 'https://github.com/ScobbleQ/Endvoyant';

/** @param {number} milliseconds */
function formatDuration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
    return 'just started';
  }

  /** @type {Array<[string, number]>} */
  const units = [
    ['d', 86_400_000],
    ['h', 3_600_000],
    ['m', 60_000],
    ['s', 1_000],
  ];

  const parts = [];
  let remaining = milliseconds;
  for (const [label, size] of units) {
    const value = Math.floor(remaining / size);
    if (value <= 0) {
      continue;
    }

    parts.push(`${value}${label}`);
    remaining -= value * size;

    if (parts.length === 2) {
      break;
    }
  }

  return parts.join(' ') || '0s';
}

/** @param {import('discord.js').Client} client */
function resolveShardLabel(client) {
  if (!client.shard) {
    return '1 / 1';
  }

  const shardId = Array.isArray(client.shard.ids) ? (client.shard.ids[0] ?? 0) : 0;
  const shardCount = client.shard.count ?? 1;
  return `${shardId + 1} / ${shardCount}`;
}

/**
 * @param {import('discord.js').Client} client
 * @returns {Promise<number>}
 */
async function resolveGuildCount(client) {
  if (!client.shard) {
    return client.guilds.cache.size;
  }

  try {
    const counts = await client.shard.fetchClientValues('guilds.cache.size');
    let total = 0;
    for (const count of counts) {
      total += Number(count ?? 0);
    }

    return total;
  } catch {
    return client.guilds.cache.size;
  }
}

/** @param {import('discord.js').Client} client */
function buildInviteUrl(client) {
  const clientId = client.application?.id || client.user?.id || BotConfig.clientId;
  // Let Discord handle scope and permissions
  return `https://discord.com/oauth2/authorize?client_id=${clientId}`;
}

/** @returns {Promise<{ userCount: number; accountCount: number } | null>} */
async function resolveLinkedStats() {
  try {
    const [userCount, accountCount] = await Promise.all([Users.count(), Accounts.count()]);
    return { userCount, accountCount };
  } catch {
    return null;
  }
}

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
