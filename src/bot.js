import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { BotConfig } from '#/config';

const client =
  /** @type {Client & { commands: Collection<string, any> }} */
  (
    new Client({
      intents: [GatewayIntentBits.Guilds],
    })
  );

client.commands = new Collection();

const folderPath = join(import.meta.dirname, 'commands');
const commandFolders = readdirSync(folderPath);

for (const file of commandFolders) {
  const filePath = join(folderPath, file);
  const command = await import(filePath);

  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
  } else {
    console.warn(`[Discord] Command at ${filePath} is missing a data or execute property.`);
  }
}

const eventPath = join(import.meta.dirname, 'events');
const eventFolders = readdirSync(eventPath);

for (const file of eventFolders) {
  const filePath = join(eventPath, file);
  const event = await import(filePath);

  if (event.default.once) {
    client.once(event.default.name, event.default.execute);
  } else {
    client.on(event.default.name, event.default.execute);
  }
}

client.login(BotConfig.token).catch((error) => {
  console.error('[Discord] Error logging in:', error);
});
