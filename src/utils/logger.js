import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import pino from 'pino';

const logDir = join(import.meta.dirname, '..', '..', 'logs');

// This makes sure the log directory exists.
mkdirSync(logDir, { recursive: true });

const logger = pino({
  level: 'info',
  transport: {
    targets: [
      { level: 'trace', target: 'pino/file', options: { destination: join(logDir, 'app.log') } },
      { level: 'info', target: 'pino/file', options: { destination: join(logDir, 'info.log') } },
      { level: 'error', target: 'pino/file', options: { destination: join(logDir, 'error.log') } },
      { target: 'pino-pretty', options: { colorize: true } },
    ],
  },
});

export default logger;
