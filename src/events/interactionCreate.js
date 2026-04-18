import { Collection, Events, MessageFlags } from 'discord.js';
import { errorContainer } from '#/components/index.js';
import { parseComponentId } from '#/utils/componentId.js';
import { canUseOwnedInteraction, getInteractionRouteHandler } from '#/utils/interactionRouting.js';
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
      await handleComponentInteraction(interaction, {
        interactionType: 'button',
        notFoundMessage: 'Button command not found',
        errorMessage: 'There was an error while executing this button',
      });
    } else if (interaction.isModalSubmit()) {
      await handleComponentInteraction(interaction, {
        interactionType: 'modal',
        notFoundMessage: 'Modal command not found',
        errorMessage: 'There was an error while executing this modal',
      });
    } else if (interaction.isStringSelectMenu()) {
      await handleComponentInteraction(interaction, {
        interactionType: 'selectMenu',
        notFoundMessage: 'Select menu command not found',
        errorMessage: 'There was an error while executing this select menu',
      });
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

/**
 * @param {import('discord.js').ButtonInteraction | import('discord.js').ModalSubmitInteraction | import('discord.js').StringSelectMenuInteraction} interaction
 * @param {{
 *   interactionType: 'button' | 'modal' | 'selectMenu',
 *   notFoundMessage: string,
 *   errorMessage: string,
 * }} options
 */
async function handleComponentInteraction(interaction, options) {
  const routed = parseComponentId(interaction.customId);
  if (!routed) {
    logger.error(`[Discord] Invalid ${options.interactionType} customId ${interaction.customId}`);
    await reply(interaction, options.notFoundMessage);
    return;
  }

  const command = interaction.client.commands.get(routed.commandName);
  const handler = getInteractionRouteHandler(command, options.interactionType, routed.routeKey);

  if (!command || !handler) {
    logger.error(`[Discord] Routed ${options.interactionType} ${interaction.customId} not found`);
    await reply(interaction, options.notFoundMessage);
    return;
  }

  if (handler.ownerOnly && !interaction.isModalSubmit() && !canUseOwnedInteraction(interaction)) {
    await reply(interaction, 'You are not the owner of this message');
    return;
  }

  try {
    await handler.execute(interaction, ...routed.args);
  } catch (error) {
    logger.error(error, `[Discord] Error executing routed ${options.interactionType}`);
    await reply(interaction, options.errorMessage);
  }
}
