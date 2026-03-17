import { and, eq } from 'drizzle-orm';
import { db } from './index.js';
import { efAttemptedCodes } from './schema.js';

export class EfAttemptedCodes {
  /**
   * Create a new attempted code
   * @param {string} aid - The account ID
   * @param {string} code - The code
   * @param {number} status - The status
   */
  static async create(aid, code, status) {
    return await db.insert(efAttemptedCodes).values({ aid, code, status });
  }
  /**
   * Get all attempted codes by account ID
   * @param {string} aid - The account ID
   */
  static async getByAid(aid) {
    return await db.query.efAttemptedCodes.findMany({
      where: eq(efAttemptedCodes.aid, aid),
    });
  }
  /**
   * Get all attempted codes by account ID
   * @param {string} aid - The account ID
   */
  static async getAccountAttemptedCodes(aid) {
    return await db.query.efAttemptedCodes.findMany({
      where: eq(efAttemptedCodes.aid, aid),
    });
  }
  /**
   * Check if a code has been attempted by an account
   * @param {string} aid - The account ID
   * @param {string} code - The code
   */
  static async isCodeAttempted(aid, code) {
    const result = await db.query.efAttemptedCodes.findFirst({
      where: and(eq(efAttemptedCodes.aid, aid), eq(efAttemptedCodes.code, code)),
    });
    return result !== undefined;
  }
}
