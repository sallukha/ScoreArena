import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import http from 'http';
import { connectDatabase, disconnectDatabase, getDatabaseHealth } from './config/db.js';
import { env, getAllowedOrigins } from './config/env.js';
import { logger, requestLogger } from './config/logger.js';
import { registerSocketHub } from './controllers/dataController.js';
import { createSocketHub } from './realtime/socketHub.js';
import { authRoutes } from './routes/authRoutes.js';
import { dataRoutes } from './routes/dataRoutes.js';
import { newsRoutes } from './routes/newsRoutes.js';

async function startServer() {
  await connectDatabase();

  const app = express();
  const allowedOrigins = getAllowedOrigins();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(requestLogger);

  app.use(
    cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
    })
  );
  app.use(express.json({ limit: env.jsonBodyLimit }));
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store');
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    const dbHealth = getDatabaseHealth();
    res.status(dbHealth.connected ? 200 : 503).json({
      status: dbHealth.connected ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      db: dbHealth,
      memory: process.memoryUsage(),
    });
  });
  app.get('/api/ready', (_req, res) => {
    const dbHealth = getDatabaseHealth();
    if (!dbHealth.connected) {
      res.status(503).json({ ready: false, db: dbHealth });
      return;
    }

    res.json({ ready: true, timestamp: new Date().toISOString() });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/data', dataRoutes);
  app.use('/api/news', newsRoutes);

  const server = http.createServer(app);
  const socketHub = createSocketHub(server);
  registerSocketHub(socketHub);
  server.keepAliveTimeout = env.keepAliveTimeoutMs;
  server.headersTimeout = env.headersTimeoutMs;
  server.requestTimeout = env.requestTimeoutMs;

  app.use((error: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled request error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Internal server error' });
  });

  server.listen(env.port, '0.0.0.0', () => {
    logger.info('Server listening', {
      port: env.port,
      nodeEnv: env.nodeEnv,
      allowedOrigins,
    });
  });

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.warn('Received shutdown signal', { signal });

    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });

    setTimeout(async () => {
      await disconnectDatabase();
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

startServer().catch((error) => {
  // Log to console directly for Render visibility
  // eslint-disable-next-line no-console
  console.error('Failed to start server:', error);
  try {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  } catch (e) {
    // If logger setup fails, print that too
    // eslint-disable-next-line no-console
    console.error('Logger failed:', e);
  }
  process.exit(1);
});
