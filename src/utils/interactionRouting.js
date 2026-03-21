/** @typedef {{ execute: (...args: any[]) => Promise<void>, ownerOnly?: boolean }} RoutedInteractionHandlerEntry */
/** @typedef {{ interactions?: Partial<Record<'button' | 'modal' | 'selectMenu', Record<string, unknown>>> }} RoutedInteractionCommand */

/**
 * Normalize a routed interaction handler entry.
 * @param {unknown} entry
 * @returns {{ execute: (...args: any[]) => Promise<void>, ownerOnly: boolean } | null}
 */
function normalizeInteractionHandler(entry) {
  if (typeof entry === 'function') {
    return {
      execute: /** @type {(...args: any[]) => Promise<void>} */ (entry),
      ownerOnly: false,
    };
  }

  if (entry && typeof entry === 'object') {
    const handler = /** @type {RoutedInteractionHandlerEntry} */ (entry);
    if (typeof handler.execute === 'function') {
      return { execute: handler.execute, ownerOnly: handler.ownerOnly === true };
    }
  }

  return null;
}

/**
 * Resolve a routed handler from a command definition.
 * @param {unknown} command
 * @param {'button' | 'modal' | 'selectMenu'} interactionType
 * @param {string} routeKey
 * @returns {{ execute: (...args: any[]) => Promise<void>, ownerOnly: boolean } | null}
 */
export function getInteractionRouteHandler(command, interactionType, routeKey) {
  if (!command || typeof command !== 'object') {
    return null;
  }

  const routedCommand = /** @type {RoutedInteractionCommand} */ (command);
  const routes = routedCommand.interactions?.[interactionType];
  if (!routes || typeof routes !== 'object') return null;

  return normalizeInteractionHandler(routes[routeKey]);
}

/**
 * Owner-gated components should only reject when Discord preserves the origin
 * interaction metadata. If the metadata is absent, allow the interaction.
 * @param {import('discord.js').MessageComponentInteraction} interaction
 * @returns {boolean}
 */
export function canUseOwnedInteraction(interaction) {
  const ownerId = interaction.message.interactionMetadata?.user.id;
  return ownerId == null || interaction.user.id === ownerId;
}
