import { sql } from 'drizzle-orm';
import {
  pgTable,
  uniqueIndex,
  foreignKey,
  unique,
  uuid,
  text,
  timestamp,
  boolean,
  smallint,
  bigint,
  jsonb,
} from 'drizzle-orm/pg-core';

export const accounts = pgTable(
  'accounts',
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    dcid: text().notNull(),
    addedOn: timestamp('added_on', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
    nickname: text().notNull(),
    accountToken: text('account_token').notNull(),
    hgId: text('hg_id').notNull(),
    userId: text('user_id').notNull(),
    roleId: text('role_id').notNull(),
    channelId: text('channel_id').notNull(),
    serverType: text('server_type').notNull(),
    serverId: text('server_id').notNull(),
    serverName: text('server_name').notNull(),
    isPrivate: boolean('is_private').default(false).notNull(),
    enableNotif: boolean('enable_notif').default(true).notNull(),
    enableSignin: boolean('enable_signin').default(true).notNull(),
    enableRedeem: boolean('enable_redeem').default(true).notNull(),
    isPrimary: boolean('is_primary').default(false).notNull(),
    shortId: smallint('short_id')
      .default(sql`'1'`)
      .notNull(),
  },
  (table) => [
    uniqueIndex('accounts_one_primary_per_user')
      .using('btree', table.dcid.asc().nullsLast().op('text_ops'))
      .where(sql`is_primary`),
    foreignKey({
      columns: [table.dcid],
      foreignColumns: [users.dcid],
      name: 'accounts_dcid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('accounts_dcid_short_id_key').on(table.dcid, table.shortId),
  ]
);

export const efCodes = pgTable(
  'ef_codes',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'ef_codes_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    code: text().notNull(),
    rewards: text().array(),
    notes: text().array(),
  },
  (table) => [unique('ef_codes_code_key').on(table.code)]
);

export const efAttemptedCodes = pgTable(
  'ef_attempted_codes',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'ef_attempted_codes_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    aid: uuid().notNull(),
    code: text().notNull(),
    attemptedAt: timestamp('attempted_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    status: smallint().notNull(),
    lastAttemptedAt: timestamp('last_attempted_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.aid],
      foreignColumns: [accounts.id],
      name: 'ef_attempted_codes_aid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    unique('ef_attempted_codes_aid_code_key').on(table.aid, table.code),
  ]
);

export const events = pgTable(
  'events',
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    id: bigint({ mode: 'number' }).primaryKey().generatedByDefaultAsIdentity({
      name: 'event_id_seq',
      startWith: 1,
      increment: 1,
      minValue: 1,
      maxValue: 9223372036854775807,
      cache: 1,
    }),
    dcid: text().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .defaultNow()
      .notNull(),
    source: text().notNull(),
    action: text().notNull(),
    metadata: jsonb(),
    aid: uuid(),
  },
  (table) => [
    foreignKey({
      columns: [table.dcid],
      foreignColumns: [users.dcid],
      name: 'event_dcid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.aid],
      foreignColumns: [accounts.id],
      name: 'events_aid_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ]
);

export const users = pgTable('users', {
  dcid: text().primaryKey().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
  isBanned: boolean('is_banned').default(false).notNull(),
  enableNotif: boolean('enable_notif').default(true).notNull(),
});
