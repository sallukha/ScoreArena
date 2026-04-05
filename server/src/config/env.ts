import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config as loadEnv } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, '../..');

for (const envFile of ['.env.local', '.env']) {
  const candidate = path.join(serverRoot, envFile);
  if (fs.existsSync(candidate)) {
    loadEnv({ path: candidate, override: envFile === '.env.local' });
  }
}

function asNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asList(value: string | undefined) {
  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  port: asNumber(process.env.PORT, 3000),
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/score-wala',
  mongoDbName: process.env.MONGO_DB_NAME || undefined,
  mongoMaxPoolSize: asNumber(process.env.MONGO_MAX_POOL_SIZE, 50),
  mongoMinPoolSize: asNumber(process.env.MONGO_MIN_POOL_SIZE, 5),
  mongoServerSelectionTimeoutMs: asNumber(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000),
  mongoSocketTimeoutMs: asNumber(process.env.MONGO_SOCKET_TIMEOUT_MS, 45000),
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresInSeconds: asNumber(process.env.JWT_EXPIRES_IN_SECONDS, 60 * 60 * 24 * 7),
  jsonBodyLimit: process.env.JSON_BODY_LIMIT || '2mb',
  keepAliveTimeoutMs: asNumber(process.env.KEEP_ALIVE_TIMEOUT_MS, 65000),
  headersTimeoutMs: asNumber(process.env.HEADERS_TIMEOUT_MS, 66000),
  requestTimeoutMs: asNumber(process.env.REQUEST_TIMEOUT_MS, 30000),
  cricketNewsApiUrl: process.env.CRICKET_NEWS_API_URL || '',
  webOrigin: process.env.WEB_ORIGIN || '',
  additionalAllowedOrigins: asList(process.env.ADDITIONAL_ALLOWED_ORIGINS),
};

export function getAllowedOrigins() {
  return Array.from(
    new Set([
      env.webOrigin,
      ...env.additionalAllowedOrigins,
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost',
      'capacitor://localhost',
      'https://localhost',
    ].filter(Boolean))
  );
}

export function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
