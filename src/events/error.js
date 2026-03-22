import { Events } from 'discord.js';
import logger from '#/logger';

export default {
  name: Events.Error,
  /** @param {Error} error */
  execute(error) {
    logger.error(error);
  },
};
