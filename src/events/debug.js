import { Events } from 'discord.js';
import logger from '#/logger';

export default {
  name: Events.Debug,
  /** @param {string} debug */
  execute(debug) {
    logger.debug(debug);
  },
};
