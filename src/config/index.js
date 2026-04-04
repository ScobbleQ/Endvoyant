import dotenv from 'dotenv';
dotenv.config({ quiet: true });

export const BotConfig = {
  token: process.env.TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  clientSecret: process.env.CLIENT_SECRET || '',
  databaseUrl: process.env.DATABASE_URL || '',
  environment: process.env.ENVIRONMENT || 'development',
  webhooks: {
    survey: process.env.SURVEY_WEBHOOK || '',
  },
};
