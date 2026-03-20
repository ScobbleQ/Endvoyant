import { Accounts } from '#/db/queries.js';

export const MISSING_ACCOUNT_MESSAGE = 'Please add an account with `/add account` to continue.';

/**
 * @param {import('discord.js').AutocompleteInteraction} interaction
 * @param {{
 *   userId?: string | number | boolean | null,
 *   query?: string,
 *   valueKey?: 'id' | 'shortId',
 * }} [options]
 */
export async function respondWithAccountAutocomplete(interaction, options = {}) {
  const { userId = interaction.user.id, query = '', valueKey = 'id' } = options;
  const normalizedUserId = typeof userId === 'string' ? userId : null;

  if (!normalizedUserId) {
    await interaction.respond([{ name: 'No user found', value: '-999' }]);
    return;
  }

  const accounts = await Accounts.getByDcid(normalizedUserId);
  if (!accounts?.length) {
    await interaction.respond([{ name: 'No accounts found', value: '-999' }]);
    return;
  }

  const normalizedQuery = query.toLowerCase();
  const filtered = accounts
    .filter((account) => account.nickname.toLowerCase().includes(normalizedQuery))
    .slice(0, 25);

  await interaction.respond(
    filtered.map((account) => ({
      name: `${account.nickname} (${account.roleId})`,
      value: String(account[valueKey]),
    }))
  );
}

/**
 * @template {{ id: string, isPrimary?: boolean }} T
 * @param {T[]} accounts
 * @param {string | null | undefined} accountId
 * @returns {T | undefined}
 */
export function resolvePrimaryAccount(accounts, accountId) {
  return accountId
    ? accounts.find((account) => account.id === accountId)
    : (accounts.find((account) => account.isPrimary) ?? accounts[0]);
}

/** @param {{ status?: number; msg?: string } | null | undefined} result */
export function parseApiError(result) {
  let code = result?.status ?? -1;
  let msg = result?.msg ?? 'Unknown error';

  try {
    const parsed = JSON.parse(result?.msg ?? '{}');
    code = parsed.code ?? code;
    msg = parsed.message ?? msg;
  } catch {
    // Keep the original message when msg is not JSON.
  }

  return { code, msg };
}

/** @param {import('discord.js').User | null} targetUser */
export function getMissingLinkedAccountMessage(targetUser) {
  return targetUser ? 'That user has no linked accounts.' : MISSING_ACCOUNT_MESSAGE;
}
