import { Events } from 'discord.js';
import { CronJob } from 'cron';
import { checkAttendance, refreshLoginToken } from '#/tasks/index.js';
import { registerFonts } from '#/utils/registerFonts.js';
import { rotatePresence } from '#/utils/rotatePresence.js';

export default {
  name: Events.ClientReady,
  once: true,
  /** @param {import("discord.js").Client} client */
  async execute(client) {
    console.info(`[Discord] Logged in as ${client.user?.tag}`);
    registerFonts();

    // Rotate the presence every 30 minutes
    // Trigger once on start
    new CronJob(
      '0 */30 * * * *',
      () => rotatePresence(client),
      null,
      true,
      'America/New_York',
      null,
      true
    );

    // Check attendance at 12:05 AM EST
    new CronJob(
      '5 12 * * *',
      () => checkAttendance(client),
      null,
      true,
      'America/New_York',
      null,
      false
    );

    // Refresh token at midnight EST
    new CronJob(
      '0 0 * * *',
      () => refreshLoginToken(),
      null,
      true,
      'America/New_York',
      null,
      false
    );
  },
};
