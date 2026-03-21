import { and, asc, desc, eq, sql, count } from 'drizzle-orm';
import { db } from './index.js';
import { accounts, users } from './schema.js';

export class Accounts {
  /**
   * Create a new account
   * @param {string} dcid - The Discord ID
   * @param {Omit<typeof accounts.$inferInsert, 'dcid' | 'shortId'>} data
   */
  static async create(dcid, data) {
    const [next] = await db
      .select({ next: sql`COALESCE(MAX(${accounts.shortId}), 0) + 1` })
      .from(accounts)
      .where(eq(accounts.dcid, dcid));
    const shortId = Number(next?.next ?? 1);
    return await db
      .insert(accounts)
      .values({ dcid, shortId, ...data })
      .returning({ id: accounts.id });
  }
  /**
   * Get all accounts by dcid
   * @param {string} dcid - The Discord ID
   */
  static async getByDcid(dcid) {
    return await db.query.accounts.findMany({
      where: eq(accounts.dcid, dcid),
      orderBy: (desc(accounts.isPrimary), asc(accounts.addedOn)),
    });
  }
  /**
   * Get an account by dcid and shortId
   * @param {string} dcid - The Discord ID
   * @param {number} shortId - The short account ID (1, 2, 3... per user)
   */
  static async getByDcidAndShortId(dcid, shortId) {
    return await db.query.accounts.findFirst({
      where: and(eq(accounts.dcid, dcid), eq(accounts.shortId, shortId)),
    });
  }
  /**
   * Get the primary account by dcid
   * @param {string} dcid - The Discord ID
   */
  static async getPrimaryByDcid(dcid) {
    return await db.query.accounts.findFirst({
      where: and(eq(accounts.dcid, dcid), eq(accounts.isPrimary, true)),
    });
  }
  static async getAll() {
    return await db.query.accounts.findMany({ columns: { dcid: true } });
  }
  static async count() {
    const [row] = await db.select({ count: count() }).from(accounts);
    return Number(row?.count ?? 0);
  }
  /**
   * Update an account
   * @param {string} dcid - The Discord ID
   * @param {string} aid - The account ID
   * @param {{ key: keyof typeof accounts, value: any }} data - The data to update
   */
  static async update(dcid, aid, { key, value }) {
    await db
      .update(accounts)
      .set({ [key]: value })
      .where(and(eq(accounts.dcid, dcid), eq(accounts.id, aid)));
  }
  /**
   * Set an account as the primary account for a user.
   * @param {string} dcid - The Discord ID
   * @param {number} shortId - The short account ID to set as primary
   */
  static async setPrimary(dcid, shortId) {
    await db.transaction(async (tx) => {
      await tx.update(accounts).set({ isPrimary: false }).where(eq(accounts.dcid, dcid));
      const target = await tx.query.accounts.findFirst({
        where: and(eq(accounts.dcid, dcid), eq(accounts.shortId, shortId)),
        columns: { id: true },
      });
      if (target)
        await tx.update(accounts).set({ isPrimary: true }).where(eq(accounts.id, target.id));
    });
  }
  /**
   * Delete an account.
   * @param {string} dcid - The Discord ID
   * @param {number} shortId - The short account ID to delete
   */
  static async delete(dcid, shortId) {
    const account = await Accounts.getByDcidAndShortId(dcid, shortId);
    if (!account) return;
    await db.delete(accounts).where(and(eq(accounts.dcid, dcid), eq(accounts.id, account.id)));
  }
  /**
   * Get an account by a matching key and value
   * @param {keyof typeof accounts.$inferSelect} key - The key to match
   * @param {any} value - The value to match
   */
  static async getDcidOfMatchingAccount(key, value) {
    return await db.query.accounts.findMany({
      columns: {
        dcid: true,
      },
      where: eq(accounts[key], value),
    });
  }
  /**
   * Get accounts with enableSignin, grouped by user.
   */
  static async getSigninByUser() {
    const rows = await db
      .select({
        account: accounts,
        user: users,
      })
      .from(accounts)
      .innerJoin(users, eq(accounts.dcid, users.dcid))
      .where(eq(accounts.enableSignin, true))
      .orderBy(desc(accounts.isPrimary), asc(accounts.addedOn));

    const byUser = Map.groupBy(rows, (row) => row.user.dcid);
    return [...byUser.values()].map((group) => ({
      ...group[0].user,
      accounts: group.map((r) => r.account),
    }));
  }
  /**
   * Check if an account exists by HG ID, role ID and server ID
   * @param {string} hgId - The HG ID
   * @param {string} roleId - The role ID
   * @param {string} serverId - The server ID
   */
  static async doesAccountExist(hgId, roleId, serverId) {
    const result = await db.query.accounts.findFirst({
      columns: {
        dcid: true,
      },
      where: and(
        eq(accounts.hgId, hgId),
        eq(accounts.roleId, roleId),
        eq(accounts.serverId, serverId)
      ),
    });

    return { doesExist: result !== undefined, dcid: result?.dcid };
  }
}
