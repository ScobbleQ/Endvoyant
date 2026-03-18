import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.js';
import { events } from './schema.js';

export class Events {
  /**
   * Create a new event
   * @param {string} dcid - The Discord ID
   * @param {{ source: 'slash'|'button'|'modal'|'select'|'cron', action: string, metadata?: { [key: string]: any } | null }} data
   */
  static async create(dcid, { source, action, metadata = null }) {
    return await db
      .insert(events)
      .values({ dcid, source, action, metadata })
      .returning({ id: events.id });
  }
  /**
   * Update an event
   * @param {string} dcid - The Discord ID
   * @param {number} eventId - The event ID
   * @param {{ metadata: { [key: string]: any } | null }} data
   */
  static async update(dcid, eventId, { metadata }) {
    await db
      .update(events)
      .set({ metadata })
      .where(and(eq(events.dcid, dcid), eq(events.id, eventId)));
  }
  /**
   * Get the last n events from the database matching the dcid
   * @param {string} dcid - The Discord ID
   * @param {number | null} limit - The number of events to get
   */
  static async getUserEvents(dcid, limit) {
    const hasLimit = limit !== null;
    return await db.query.events.findMany({
      where: eq(events.dcid, dcid),
      orderBy: hasLimit ? desc(events.createdAt) : undefined,
      limit: hasLimit ? limit : undefined,
    });
  }
}
