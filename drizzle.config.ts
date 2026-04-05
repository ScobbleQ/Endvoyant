import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  console.error('[Drizzle] DATABASE_URL is not set');
  process.exit(1);
}

export default defineConfig({
  dialect: 'postgresql',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schema: './drizzle/schema.ts',
  migrations: {},
  verbose: true,
  strict: true,
});
