import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL) {
  console.error('[Drizzle] DATABASE_URL is not set');
  process.exit(1);
}

export default defineConfig({
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  schema: './drizzle/schema.ts',
  migrations: {
    path: './drizzle/migrations',
    pattern: '*.ts',
  },
  verbose: true,
  strict: true,
  onSuccess: () => {
    logger.info('Migration successful');
  },
});
