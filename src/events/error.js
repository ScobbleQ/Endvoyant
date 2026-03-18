import { Events } from 'discord.js';
import logger from '#/logger';

export default {
  name: Events.Error,
  once: false,
  /** @param {Error} error */
  execute(error) {
    logger.error(error);
  },
};
