import { ActivityType, PresenceUpdateStatus } from 'discord.js';
import logger from '#/logger';

/** @type {import('discord.js').PresenceData[]} */
const presences = [
  {
    activities: [{ name: 'Arknights: Endfield', type: ActivityType.Playing }],
    status: PresenceUpdateStatus.Online,
  },
  {
    activities: [{ name: 'Talos-II', type: ActivityType.Watching }],
    status: PresenceUpdateStatus.Online,
  },
  {
    activities: [{ name: 'OMV Dijiang', type: ActivityType.Competing }],
    status: PresenceUpdateStatus.DoNotDisturb,
  },
];

/**
 * Rotate the presence to a random presence
 * @param {import('discord.js').Client} client
 */
export function rotatePresence(client) {
  const random = Math.floor(Math.random() * presences.length);
  const presence = presences[random];

  client.user?.setPresence(presence);
  logger.info(`[Discord] Presence set to ${presence.activities?.[0].name}`);
}
