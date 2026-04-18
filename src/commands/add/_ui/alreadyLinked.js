import { ContainerBuilder } from 'discord.js';
import { privacy } from '#/utils/privacy.js';

/**
 * Container for when an account is already to a Discord profile
 * @param {boolean} isOwnedByUser
 * @param {string} dcid
 */
export function alreadyLinkedContainer(isOwnedByUser, dcid) {
  const msg = isOwnedByUser
    ? `This account is already linked to your Discord profile.`
    : `This account is already linked to a different Discord profile (${privacy(dcid, true)}). If this is yours, contact support to recover access.`;

  return new ContainerBuilder().addTextDisplayComponents((textDisplay) =>
    textDisplay.setContent(msg)
  );
}
