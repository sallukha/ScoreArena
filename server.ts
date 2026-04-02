import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import http from 'http';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { connectDatabase, disconnectDatabase, getDatabaseHealth } from './backend/config/db';
import { authRoutes } from './backend/routes/authRoutes';
import { dataRoutes } from './backend/routes/dataRoutes';
import { newsRoutes } from './backend/routes/newsRoutes';
import { createSocketHub } from './backend/realtime/socketHub';
import { registerSocketHub } from './backend/controllers/dataController';

async function startServer() {
  await connectDatabase();

  const app = express();
  const port = Number(process.env.PORT || 3000);
  const isProduction = process.env.NODE_ENV === 'production';
  const corsOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const jsonLimit = process.env.JSON_BODY_LIMIT || '5mb';

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || corsOrigins.length === 0 || corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error('CORS blocked'));
      },
    })
  );
  app.use(express.json({ limit: jsonLimit }));
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

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(
      express.static(distPath, {
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-store');
          }
        },
      })
    );
    app.get('*', (req, res) => {
      if (path.extname(req.path)) {
        res.status(404).end();
        return;
      }

      res.setHeader('Cache-Control', 'no-store');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const socketHub = createSocketHub(server);
  registerSocketHub(socketHub);
  server.keepAliveTimeout = Number(process.env.KEEP_ALIVE_TIMEOUT_MS || 65000);
  server.headersTimeout = Number(process.env.HEADERS_TIMEOUT_MS || 66000);
  server.requestTimeout = Number(process.env.REQUEST_TIMEOUT_MS || 30000);

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });

  let isShuttingDown = false;
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`Received ${signal}. Shutting down gracefully...`);

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
  console.error('Failed to start server', error);
  process.exit(1);
});
