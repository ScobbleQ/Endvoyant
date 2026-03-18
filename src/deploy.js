import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REST, Routes } from 'discord.js';
import { BotConfig } from '#/config';
import logger from '#/logger';

/** @type {import("discord.js").SlashCommandBuilder[]} */
const commands = [];

const folderPath = join(import.meta.dirname, 'commands');
const commandFolders = readdirSync(folderPath).filter((file) => file.endsWith('.js'));

for (const file of commandFolders) {
  const filePath = join(folderPath, file);
  const command = await import(filePath);

  if (command.default && 'data' in command.default && 'execute' in command.default) {
    commands.push(command.default.data.toJSON());
  } else {
    logger.warn(`[Discord] Command at ${filePath} is missing a data or execute property.`);
  }
}

const rest = new REST().setToken(BotConfig.token);

try {
  const data = await rest.put(Routes.applicationCommands(BotConfig.clientId), { body: commands });
  logger.info(`[Discord] Successfully deployed ${Array.isArray(data) ? data.length : 0} commands`);
} catch (error) {
  logger.error(error, '[Discord] Error deploying commands');
}
