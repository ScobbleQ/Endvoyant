const COMPONENT_ID_SEPARATOR = '|';

/**
 * Build a component custom ID using escaped segments so payloads can contain
 * punctuation without breaking router parsing.
 * @param {string} commandName
 * @param {string} routeKey
 * @param {...string} args
 * @returns {string}
 */
export function createComponentId(commandName, routeKey, ...args) {
  return [commandName, routeKey, ...args]
    .map((part) => encodeURIComponent(part))
    .join(COMPONENT_ID_SEPARATOR);
}

/**
 * Parse a routed component custom ID.
 * @param {string} customId
 * @returns {{ commandName: string, routeKey: string, args: string[] } | null}
 */
export function parseComponentId(customId) {
  const parts = customId.split(COMPONENT_ID_SEPARATOR);
  if (parts.length < 2) return null;

  try {
    const [commandName, routeKey, ...args] = parts.map((part) => decodeURIComponent(part));
    if (!commandName || !routeKey) return null;
    return { commandName, routeKey, args };
  } catch {
    return null;
  }
}
