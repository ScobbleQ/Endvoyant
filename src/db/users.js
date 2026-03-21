import { eq, count } from 'drizzle-orm';
import { db } from './index.js';
import { users } from './schema.js';

export class Users {
  static async getAll() {
    return await db.select({ dcid: users.dcid }).from(users);
  }
  static async count() {
    const [row] = await db.select({ count: count() }).from(users);
    return Number(row?.count ?? 0);
  }
  /**
   * Create a new user
   * @param {string} dcid - The Discord ID
   */
  static async create(dcid) {
    return await db.insert(users).values({ dcid });
  }
  /**
   * Get a user by their Discord ID
   * @param {string} dcid - The Discord ID
   */
  static async getByDcid(dcid) {
    return await db.query.users.findFirst({
      where: eq(users.dcid, dcid),
    });
  }
  /**
   * Update a user
   * @param {string} dcid - The Discord ID
   * @param {{ key: keyof typeof users, value: any }} data
   */
  static async update(dcid, { key, value }) {
    await db
      .update(users)
      .set({ [key]: value })
      .where(eq(users.dcid, dcid));
  }
  /**
   * Delete a user
   * @param {string} dcid - The Discord ID
   */
  static async delete(dcid) {
    await db.delete(users).where(eq(users.dcid, dcid));
  }
}
