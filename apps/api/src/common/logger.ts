import pino, { type Logger, type LoggerOptions } from 'pino';

export function createLogger(level: string): Logger {
  const isDev = process.env.NODE_ENV !== 'production';
  const opts: LoggerOptions = {
    level,
    base: { service: 'apexcare-api' },
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'req.body.newPassword',
        'req.body.currentPassword',
        'res.headers["set-cookie"]',
      ],
      censor: '[REDACTED]',
    },
  };
  if (isDev) {
    opts.transport = {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'SYS:HH:MM:ss.l', singleLine: true },
    };
  }
  return pino(opts);
}
