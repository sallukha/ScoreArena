import morgan from 'morgan';
import winston from 'winston';

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export const requestLogger = morgan('combined', {
  skip(req, res) {
    if (req.method === 'OPTIONS') return true;
    const pathname = new URL(req.url || '/', 'http://localhost').pathname;

    const isMissingDocumentLookup =
      req.method === 'GET' &&
      pathname === '/api/data/document' &&
      res.statusCode === 404;

    return isMissingDocumentLookup;
  },
  stream: {
    write(message: string) {
      logger.info(message.trim(), { scope: 'http' });
    },
  },
});
