import { ContainerBuilder } from 'discord.js';

/**
 * Container for a text message
 * @param {string} text
 */
export function textContainer(text) {
  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(text)
  );
}
