import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { errorContainer, warningContainer } from '#/components/index.js';
import { Events, Accounts, Users } from '#/db/index.js';
import { BotConfig } from '#/config';

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

    const user = await Users.getByDcid(interaction.user.id);
    if (!user && !uid) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (!uid) {
      const [account] = await Accounts.getByDcid(interaction.user.id);
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
      await Events.create(user.dcid, {
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
