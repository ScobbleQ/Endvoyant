import { ShardingManager } from 'discord.js';
import { BotConfig } from '#/config';
import logger from '#/logger';

const manager = new ShardingManager('./bot.js', {
  token: BotConfig.token,
});

manager.on('shardCreate', (shard) => {
  logger.info(`[Discord] Launched shard ${shard.id}`);
});

manager.spawn().catch((error) => {
  logger.error(error, '[Discord] Error spawning shards');
});
