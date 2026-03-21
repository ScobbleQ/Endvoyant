import { Collection, Events, MessageFlags } from 'discord.js';
import { errorContainer } from '#/components/containers/index.js';
import logger from '#/logger';

export default {
  name: Events.InteractionCreate,
  /** @param {import("discord.js").Interaction} interaction */
  async execute(interaction) {
    if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command || typeof command.execute !== 'function') {
        logger.error(`[Discord] Command ${interaction.commandName} not found`);
        await reply(interaction, 'Command not found');
        return;
      }

      const now = Date.now();
      const timestamps = getCooldownTimestamps(interaction.client, command.data.name);
      const cooldownAmount = (command.data.cooldown ?? 5) * 1000;
      const existingTimestamp = timestamps.get(interaction.user.id);

      if (existingTimestamp != null) {
        const expirationTime = existingTimestamp + cooldownAmount;
        if (now < expirationTime) {
          const timeLeft = Math.ceil(expirationTime / 1000);
          await reply(
            interaction,
            `Please wait, you are on a cooldown for \`/${command.data.name}\`. You can use it again <t:${timeLeft}:R>.`
          );
          return;
        }
      }

      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

      try {
        await command.execute(interaction);
      } catch (error) {
        logger.error(error, `[Discord] Error executing command ${interaction.commandName}`);
        await reply(interaction, 'There was an error while executing this command');
      }
    } else if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command || typeof command.autocomplete !== 'function') {
        logger.error(`[Discord] Autocomplete command ${interaction.commandName} not found`);
        await reply(interaction, 'Autocomplete command not found');
        return;
      }

      try {
        await command.autocomplete(interaction);
      } catch (error) {
        logger.error(
          error,
          `[Discord] Error executing autocomplete command ${interaction.commandName}`
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
      const command = interaction.client.commands.get(commandName);

      if (!command || typeof command.button !== 'function') {
        logger.error(`[Discord] Button command ${commandName} not found`);
        await reply(interaction, 'Button command not found');
        return;
      }

      try {
        await command.button(interaction, ...args);
      } catch (error) {
        logger.error(error, `[Discord] Error executing button command ${commandName}`);
        await reply(interaction, 'There was an error while executing this button');
      }
    } else if (interaction.isModalSubmit()) {
      const [commandName, ...args] = interaction.customId.split('-');
      const command = interaction.client.commands.get(commandName);

      if (!command || typeof command.modal !== 'function') {
        logger.error(`[Discord] Modal command ${commandName} not found`);
        await reply(interaction, 'Modal command not found');
        return;
      }

      try {
        await command.modal(interaction, ...args);
      } catch (error) {
        logger.error(error, `[Discord] Error executing modal command ${commandName}`);
        await reply(interaction, 'There was an error while executing this modal');
      }
    } else if (interaction.isStringSelectMenu()) {
      // Ensure only owner is able to use the select menu
      if (interaction.user.id !== interaction.message.interactionMetadata?.user.id) {
        await reply(interaction, 'You are not the owner of this message');
        return;
      }

      const [commandName, ...args] = interaction.customId.split('-');
      const command = interaction.client.commands.get(commandName);

      if (!command || typeof command.selectMenu !== 'function') {
        logger.error(`[Discord] Select menu command ${commandName} not found`);
        await reply(interaction, 'Select menu command not found');
        return;
      }

      try {
        await command.selectMenu(interaction, ...args);
      } catch (error) {
        logger.error(error, `[Discord] Error executing select menu command ${commandName}`);
        await reply(interaction, 'There was an error while executing this select menu');
      }
    } else {
      logger.error(`[Discord] Unhandled interaction type: ${interaction.type}`);
      await reply(interaction, 'Unknown interaction type');
    }
  },
};

/**
 *
 * @param {import("discord.js").Interaction} interaction
 * @param {string} message
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

/**
 * @param {import('discord.js').Client} client
 * @param {string} commandName
 */
function getCooldownTimestamps(client, commandName) {
  let timestamps = client.cooldowns.get(commandName);

  if (!timestamps) {
    timestamps = new Collection();
    client.cooldowns.set(commandName, timestamps);
  }

  return timestamps;
}
