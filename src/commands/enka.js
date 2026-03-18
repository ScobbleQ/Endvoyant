import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { errorContainer, warningContainer } from '#/components/containers/index.js';
import { createEvent, getAccount, getUser } from '#/db/queries.js';
import { BotConfig } from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('enka')
    .setDescription('View your profile via Enka.Network')
    .addStringOption((option) =>
      option.setName('uid').setDescription('The UID of the account to view').setRequired(false)
    )
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    let uid = interaction.options.getString('uid') || null;

    const user = await getUser(interaction.user.id);
    if (!user && !uid) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (!uid) {
      const account = await getAccount(interaction.user.id);
      if (!account) {
        await interaction.reply({
          components: [errorContainer('Please add an account with `/add account` to continue.')],
          flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
        });
        return;
      }

      uid = account.roleId;
    }

    if (user && BotConfig.environment === 'production') {
      await createEvent(interaction.user.id, {
        source: 'slash',
        action: 'enka',
      });
    }

    await interaction.reply({
      components: [
        warningContainer(
          `Enka integration will be available once Enka.Network API is stable.\n${uid}`
        ),
      ],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  },
};
