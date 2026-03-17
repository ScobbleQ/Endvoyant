import { relations } from 'drizzle-orm/relations';
import { users, accounts, efAttemptedCodes, events } from './schema.js';

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  user: one(users, {
    fields: [accounts.dcid],
    references: [users.dcid],
  }),
  efAttemptedCodes: many(efAttemptedCodes),
}));

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  events: many(events),
}));

export const efAttemptedCodesRelations = relations(efAttemptedCodes, ({ one }) => ({
  account: one(accounts, {
    fields: [efAttemptedCodes.aid],
    references: [accounts.id],
  }),
}));

export const eventsRelations = relations(events, ({ one }) => ({
  user: one(users, {
    fields: [events.dcid],
    references: [users.dcid],
  }),
}));
