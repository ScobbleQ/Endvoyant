import {
  ContainerBuilder,
  MessageFlags,
  SlashCommandBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { BotConfig } from '../../config.js';
import { createEvent, getAccount, getUser } from '../db/queries.js';
import { MessageTone, noUserContainer } from '../utils/containers.js';

export default {
  data: new SlashCommandBuilder()
    .setName('settings')
    .setDescription('Settings command')
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
        action: 'settings',
      });
    }

    const account = await getAccount(interaction.user.id);
    console.log(account);

    const container = new ContainerBuilder();
    container.addTextDisplayComponents((textDisplay) =>
      textDisplay.setContent(
        '## Settings\nComing soon....\n\n-# In the meantime, you can join our support server and request settings changes there.'
      )
    );
    container.addActionRowComponents((row) =>
      row.addComponents(
        new ButtonBuilder()
          .setLabel('Join Support Server')
          .setStyle(ButtonStyle.Link)
          .setURL('https://discord.gg/5rUsSZTyf2')
      )
    );

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
};
