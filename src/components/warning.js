import { ContainerBuilder } from 'discord.js';

/**
 * Container for a warning message
 * @param {string} warning
 */
export function warningContainer(warning) {
  return new ContainerBuilder()
    .setAccentColor(0xffff00)
    .addTextDisplayComponents((textDisplay) => textDisplay.setContent(warning));
}
