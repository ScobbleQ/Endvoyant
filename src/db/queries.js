export * from './users.js';
export * from './accounts.js';
export * from './events.js';
export * from './efAttemptedCodes.js';

import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.js';
import { accounts, events, users } from './schema.js';

/**
 * Get a user from the database
 * @param {string} dcid
 */
export async function getUser(dcid) {
  const user = await db
    .select({
      dcid: users.dcid,
      createdAt: users.createdAt,
      isBanned: users.isBanned,
    })
    .from(users)
    .where(eq(users.dcid, dcid))
    .limit(1);

  if (!user || user.length === 0) {
    return null;
  }

  return user[0];
}

/**
 * Get all dcid from the database
 */
export async function getAllUsers() {
  return await db.select({ dcid: users.dcid }).from(users);
}

/**
 * Get an account from the database matching the dcid
 * @param {string} dcid - The Discord ID
 */
export async function getAccount(dcid) {
  const account = await db
    .select({
      id: accounts.id,
      dcid: accounts.dcid,
      addedOn: accounts.addedOn,
      nickname: accounts.nickname,
      accountToken: accounts.accountToken,
      hgId: accounts.hgId,
      userId: accounts.userId,
      roleId: accounts.roleId,
      channelId: accounts.channelId,
      serverType: accounts.serverType,
      serverId: accounts.serverId,
      serverName: accounts.serverName,
      isPrivate: accounts.isPrivate,
      enableNotif: accounts.enableNotif,
      enableSignin: accounts.enableSignin,
    })
    .from(accounts)
    .where(eq(accounts.dcid, dcid));

  if (!account || account.length === 0) {
    return null;
  }

  return account[0];
}

/**
 * Update an account in the database matching the dcid and aid
 * @param {string} dcid - The Discord ID
 * @param {string} aid - The Account ID
 * @param {{ key: keyof typeof accounts, value: any }} data
 */
export async function updateAccount(dcid, aid, { key, value }) {
  await db
    .update(accounts)
    .set({ [key]: value })
    .where(and(eq(accounts.dcid, dcid), eq(accounts.id, aid)));
}
