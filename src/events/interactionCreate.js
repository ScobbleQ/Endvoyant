import { Events, MessageFlags } from 'discord.js';
import { errorContainer } from '#/components/containers/index.js';

export default {
  name: Events.InteractionCreate,
  /** @param {import("discord.js").Interaction} interaction */
  async execute(interaction) {
    const client = interaction.client;

    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command =
        /** @type {import("discord.js").Client & { commands: import("discord.js").Collection<string, any> }} */ (
          client
        ).commands.get(interaction.commandName);

      if (!command || typeof command.execute !== 'function') {
        console.error(`[Discord] Command ${interaction.commandName} not found`);
        await reply(interaction, 'Command not found');
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(`[Discord] Error executing command ${interaction.commandName}:`, error);
        await reply(interaction, 'There was an error while executing this command');
      }
    } else if (interaction.isAutocomplete()) {
      const command =
        /** @type {import("discord.js").Client & { commands: import("discord.js").Collection<string, any> }} */ (
          interaction.client
        ).commands.get(interaction.commandName);

      if (!command || typeof command.autocomplete !== 'function') {
        console.error(`[Discord] Autocomplete command ${interaction.commandName} not found`);
        await reply(interaction, 'Autocomplete command not found');
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(
          `[Discord] Error executing autocomplete command ${interaction.commandName}:`,
          error
        );
        await reply(interaction, 'There was an error while executing this autocomplete');
      }
    } else if (interaction.isButton()) {
      // Ensure only owner is able to use the button
      if (interaction.user.id !== interaction.message.interactionMetadata?.user.id) {
        await reply(interaction, 'You are not the owner of this message');
        return;
      }

      const [commandName, ...args] = interaction.customId.split('-');
      const command =
        /** @type {import("discord.js").Client & { commands: import("discord.js").Collection<string, any> }} */ (
          client
        ).commands.get(commandName);

      if (!command || typeof command.button !== 'function') {
        console.error(`[Discord] Button command ${commandName} not found`);
        await reply(interaction, 'Button command not found');
        return;
      }

      try {
        await command.button(interaction, ...args);
      } catch (error) {
        console.error(`[Discord] Error executing button command ${commandName}:`, error);
        await reply(interaction, 'There was an error while executing this button');
      }
    } else if (interaction.isModalSubmit()) {
      const [commandName, ...args] = interaction.customId.split('-');
      const command =
        /** @type {import("discord.js").Client & { commands: import("discord.js").Collection<string, any> }} */ (
          client
        ).commands.get(commandName);

      if (!command || typeof command.modal !== 'function') {
        console.error(`[Discord] Modal command ${commandName} not found`);
        await reply(interaction, 'Modal command not found');
        return;
      }

      try {
        await command.modal(interaction, ...args);
      } catch (error) {
        console.error(`[Discord] Error executing modal command ${commandName}:`, error);
        await reply(interaction, 'There was an error while executing this modal');
      }
    } else if (interaction.isStringSelectMenu()) {
      // Ensure only owner is able to use the select menu
      if (interaction.user.id !== interaction.message.interactionMetadata?.user.id) {
        await reply(interaction, 'You are not the owner of this message');
        return;
      }

      const [commandName, ...args] = interaction.customId.split('-');
      const command =
        /** @type {import("discord.js").Client & { commands: import("discord.js").Collection<string, any> }} */ (
          client
        ).commands.get(commandName);

      if (!command || typeof command.selectMenu !== 'function') {
        console.error(`[Discord] Select menu command ${commandName} not found`);
        await reply(interaction, 'Select menu command not found');
        return;
      }

      try {
        await command.selectMenu(interaction, ...args);
      } catch (error) {
        console.error(`[Discord] Error executing select menu command ${commandName}:`, error);
        await reply(interaction, 'There was an error while executing this select menu');
      }
    } else {
      console.error(`[Discord] Unhandled interaction type: ${interaction.type}`);
      await reply(interaction, 'Unknown interaction type');
    }
  },
};

/**
 *
 * @param {import("discord.js").Interaction} interaction
 * @param {*} message
 */
async function reply(interaction, message) {
  if (interaction.isAutocomplete()) {
    await interaction.respond([{ name: message, value: '-999' }]);
    return;
  }

  if (interaction.deferred || interaction.replied) {
    await interaction.followUp({
      components: [errorContainer(message)],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  } else {
    await interaction.reply({
      components: [errorContainer(message)],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
  }
}
