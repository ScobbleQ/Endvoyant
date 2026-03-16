import { and, eq } from 'drizzle-orm';
import { db } from './index.js';
import { accounts } from './schema.js';

export class Accounts {
  /**
   * Create a new account
   * @param {string} dcid - The Discord ID
   * @param {Omit<typeof accounts.$inferInsert, 'dcid'>} data
   */
  static async create(dcid, data) {
    return await db
      .insert(accounts)
      .values({ dcid, ...data })
      .returning({ id: accounts.id });
  }
  /**
   * Get all accounts by dcid
   * @param {string} dcid - The Discord ID
   */
  static async getByDcid(dcid) {
    return await db.query.accounts.findMany({
      where: eq(accounts.dcid, dcid),
    });
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
   * Get an account by a matching key and value
   * @param {keyof typeof accounts.$inferSelect} key - The key to match
   * @param {any} value - The value to match
   */
  static async getMatchingAccount(key, value) {
    return await db.query.accounts.findMany({
      where: eq(accounts[key], value),
    });
  }
}
