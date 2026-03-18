import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import JSZip from 'jszip';
import { errorContainer } from '#/components/containers/index.js';
import { Accounts, Users, Events, EfAttemptedCodes } from '#/db/queries.js';
import { BotConfig } from '../../config.js';

export default {
  data: new SlashCommandBuilder()
    .setName('data')
    .setDescription('View all your account data')
    .setIntegrationTypes([0, 1])
    .setContexts([0, 1, 2]),
  /** @param {import("discord.js").ChatInputCommandInteraction} interaction */
  async execute(interaction) {
    const user = await Users.getByDcid(interaction.user.id);
    if (!user) {
      await interaction.reply({
        components: [errorContainer('Please add an account with `/add account` to continue.')],
        flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
      });
      return;
    }

    if (BotConfig.environment === 'production') {
      await Events.create(interaction.user.id, {
        source: 'slash',
        action: 'data',
      });
    }

    const accounts = await Accounts.getByDcid(interaction.user.id);
    const events = await Events.getUserEvents(interaction.user.id, null);
    const allAttemptedCodes = [];

    const zip = new JSZip();
    zip.file('user.json', JSON.stringify(user, null, 4));

    if (accounts && accounts.length > 0) {
      zip.file('accounts.json', JSON.stringify(accounts, null, 4));

      for (const account of accounts) {
        const attemptedCodes = await EfAttemptedCodes.getAccountAttemptedCodes(account.id);
        allAttemptedCodes.push(...attemptedCodes);
      }
    }

    if (events && events.length > 0) {
      zip.file('events.json', JSON.stringify(events, null, 4));
    }

    if (allAttemptedCodes && allAttemptedCodes.length > 0) {
      zip.file('attempted_codes.json', JSON.stringify(allAttemptedCodes, null, 4));
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const filename = `endvoyant-${user.dcid}.zip`;

    await interaction.reply({
      content: 'Here is your requested data.',
      files: [{ attachment: zipBuffer, name: filename }],
      flags: [MessageFlags.Ephemeral],
    });
  },
};
