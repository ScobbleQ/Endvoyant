import { join } from 'node:path';
import { REST, Routes } from 'discord.js';
import { walkJavaScriptFiles } from '#/utils/walkJavaScriptFiles.js';
import { BotConfig } from '#/config';
import logger from '#/logger';

const commands = [];

const folderPath = join(import.meta.dirname, 'commands');
const commandFiles = walkJavaScriptFiles(folderPath);

for (const filePath of commandFiles) {
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
