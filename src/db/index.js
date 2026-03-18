import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { BotConfig } from '#/config';
import * as relations from './relations.js';
import * as schema from './schema.js';

const client = postgres(BotConfig.databaseUrl);
export const db = drizzle(client, { schema: { ...schema, ...relations } });
