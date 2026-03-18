import { ContainerBuilder } from 'discord.js';

/**
 * Container for an error message
 * @param {string} error
 */
export function errorContainer(error) {
  return new ContainerBuilder()
    .setAccentColor(0xff0000)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(error));
}
