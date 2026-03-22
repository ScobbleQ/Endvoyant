import { Events } from 'discord.js';
import logger from '#/logger';

export default {
  name: Events.Warn,
  /** @param {string} warning */
  execute(warning) {
    logger.warn(warning);
  },
};
