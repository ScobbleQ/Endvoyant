export * from './users.js';
export * from './accounts.js';
export * from './events.js';
export * from './efAttemptedCodes.js';

import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.js';
import { accounts, events, users } from './schema.js';

/**
 * Create user and account in a single transaction (all-or-nothing).
 * @param {string} dcid
 * @param {Omit<typeof accounts.$inferInsert, 'dcid'>} data
 */
export async function createEndfieldAccount(dcid, data) {
  await db.transaction(async (tx) => {
    await tx.insert(users).values({ dcid });
    await tx.insert(accounts).values({ dcid, ...data });
  });
}

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
 * Update the user in the database
 * @param {string} dcid - The Discord ID
 * @param {{ key: keyof typeof users, value: any }} data
 * @returns {Promise<void>}
 */
export async function updateUser(dcid, { key, value }) {
  await db
    .update(users)
    .set({ [key]: value })
    .where(eq(users.dcid, dcid));
}

/**
 * Delete a user from the database
 * @param {string} dcid - The Discord ID
 * @returns {Promise<void>}
 */
export async function deleteUser(dcid) {
  await db.delete(users).where(eq(users.dcid, dcid));
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
 * Get all accounts from the database matching the dcid
 * @param {string} dcid - The Discord ID
 */
export async function getAllAccounts(dcid) {
  return await db.select({ dcid: accounts.dcid }).from(accounts).where(eq(accounts.dcid, dcid));
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

/**
 * Create an event in the database
 * @param {string} dcid - The Discord ID
 * @param {{ source: 'slash'|'button'|'modal'|'select'|'cron', action: string, metadata?: { [key: string]: any } | null }} param0
 * @returns {Promise<{ id: number }>}
 */
export async function createEvent(dcid, { source, action, metadata = null }) {
  const res = await db
    .insert(events)
    .values({ dcid, source, action, metadata })
    .returning({ id: events.id });

  return res[0];
}

/**
 * Update the metadata of an event in the database matching the dcid and eventId
 * @param {string} dcid - The Discord ID
 * @param {number} eventId - The Event ID
 * @param {{ metadata: any | null }} data
 */
export async function updateEventMetadata(dcid, eventId, { metadata }) {
  await db
    .update(events)
    .set({ metadata })
    .where(and(eq(events.dcid, dcid), eq(events.id, eventId)));
}

/**
 * Get the last n events from the database matching the dcid
 * @param {string} dcid - The Discord ID
 * @param {number} [limit=10] - The number of events to get
 * @returns {Promise<{ createdAt: string, source: string, action: string, metadata: any }[]>}
 */
export async function getEvents(dcid, limit = 10) {
  return await db
    .select({
      createdAt: events.createdAt,
      source: events.source,
      action: events.action,
      metadata: events.metadata,
    })
    .from(events)
    .where(eq(events.dcid, dcid))
    .orderBy(desc(events.createdAt))
    .limit(limit);
}

/**
 * Get all dcid from the database where enableSignin is true
 */
export async function getAllUsersWithAttendance() {
  return await db
    .select({ dcid: accounts.dcid })
    .from(accounts)
    .where(eq(accounts.enableSignin, true));
}
