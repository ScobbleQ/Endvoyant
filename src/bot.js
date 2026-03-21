import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { BotConfig } from '#/config';
import logger from '#/logger';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();
client.cooldowns = new Collection();

const folderPath = join(import.meta.dirname, 'commands');
const commandFiles = readdirSync(folderPath).filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = join(folderPath, file);
  const command = await import(filePath);

  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
  } else {
    logger.warn(`[Discord] Command at ${filePath} is missing a data or execute property.`);
  }
}

const eventPath = join(import.meta.dirname, 'events');
const eventFiles = readdirSync(eventPath).filter((file) => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = join(eventPath, file);
  const event = await import(filePath);

  if (event.default.once) {
    client.once(event.default.name, event.default.execute);
  } else {
    client.on(event.default.name, event.default.execute);
  }
}

client.login(BotConfig.token).catch((error) => {
  logger.error('[Discord] Error logging in:', error);
});
